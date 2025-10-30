import { db } from '../../db';
import { newsFeed } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Telegram News Sync Service
 * Syncs news and announcements from Fushuma's Telegram channel
 */

const TELEGRAM_CHANNEL = '@FushumaChain';
const TELEGRAM_CHANNEL_URL = 'https://t.me/FushumaChain';

interface TelegramMessage {
  id: string;
  date: Date;
  text: string;
  author?: string;
  media?: any[];
  links?: string[];
}

interface SyncResult {
  synced: number;
  errors: number;
  lastMessageId?: string;
}

class TelegramSyncService {
  private botToken: string | null = null;
  private channelId: string = TELEGRAM_CHANNEL;
  private channelUsername: string = 'FushumaChain';
  private autoSyncEnabled: boolean = false;
  private syncInterval: number = 300000; // 5 minutes
  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the Telegram sync service
   */
  async initialize(
    botToken?: string,
    autoSync: boolean = false,
    syncIntervalMs: number = 300000
  ): Promise<void> {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || null;
    this.channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME || 'FushumaChain';
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '@FushumaChain';
    this.autoSyncEnabled = autoSync;
    this.syncInterval = syncIntervalMs;

    if (!this.botToken) {
      console.warn('⚠️  Telegram bot token not provided, using public channel scraping');
    }

    // Run initial sync immediately
    console.log('🔄 Running initial Telegram sync...');
    await this.syncMessages().catch(err => {
      console.error('❌ Initial sync failed:', err);
    });

    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }

    console.log('✅ TelegramSyncService initialized');
  }

  /**
   * Extract links from text
   */
  private extractLinks(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return Array.from(text.matchAll(urlRegex)).map(match => match[1]);
  }

  /**
   * Fetch messages from public Telegram channel by scraping the web page
   * This works for public channels without needing bot admin access
   */
  private async fetchMessagesFromChannel(limit: number = 50): Promise<TelegramMessage[]> {
    try {
      // Use the public channel preview URL
      const channelUsername = this.channelId.replace('@', '');
      const url = `https://t.me/s/${channelUsername}`;
      
      console.log(`📡 Fetching messages from ${url}`);
      
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse HTML to extract messages
      const messages: TelegramMessage[] = [];
      
      // Match message blocks in the HTML
      const messageRegex = /<div class="tgme_widget_message[^"]*"[^>]*data-post="[^"]+"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
      const matches = html.matchAll(messageRegex);
      
      for (const match of matches) {
        const messageHtml = match[0];
        
        // Extract message ID
        const idMatch = messageHtml.match(/data-post="[^/]+\/(\d+)"/);
        if (!idMatch) continue;
        const messageId = idMatch[1];
        
        // Extract text content
        const textMatch = messageHtml.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        let text = '';
        if (textMatch) {
          // Remove HTML tags and decode entities
          text = textMatch[1]
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
        }
        
        // Extract date
        const dateMatch = messageHtml.match(/<time[^>]*datetime="([^"]+)"/);
        const date = dateMatch ? new Date(dateMatch[1]) : new Date();
        
        // Extract media (photos)
        const media: any[] = [];
        const photoMatches = messageHtml.matchAll(/<a[^>]*class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)"/g);
        for (const photoMatch of photoMatches) {
          media.push({ type: 'photo', url: photoMatch[1] });
        }
        
        // Extract video
        const videoMatch = messageHtml.match(/<video[^>]*src="([^"]+)"/);
        if (videoMatch) {
          const thumbnailMatch = messageHtml.match(/<video[^>]*poster="([^"]+)"/);
          media.push({ 
            type: 'video', 
            url: videoMatch[1],
            thumbnail: thumbnailMatch ? thumbnailMatch[1] : null
          });
        }
        
        if (text || media.length > 0) {
          messages.push({
            id: messageId,
            date,
            text,
            author: 'Fushuma Team',
            media: media.length > 0 ? media : undefined,
            links: this.extractLinks(text),
          });
        }
        
        if (messages.length >= limit) break;
      }
      
      console.log(`📊 Fetched ${messages.length} messages from Telegram`);
      return messages;
    } catch (error) {
      console.error('❌ Error fetching from public channel:', error);
      return [];
    }
  }

  /**
   * Parse Telegram message into news article
   */
  private parseMessage(message: TelegramMessage): {
    title: string;
    content: string;
    excerpt: string;
    category?: string;
    tags: string[];
    imageUrl?: string;
  } {
    const text = message.text;
    const lines = text.split('\n').filter(line => line.trim());

    // First line is usually the title
    const title = lines[0]?.trim() || 'Fushuma Update';

    // Use the full text as content
    const content = text.trim();

    // Create excerpt (first 200 chars of content)
    const excerpt = content.length > 200 
      ? content.substring(0, 200) + '...' 
      : content;

    // Extract category from hashtags
    const categoryMatch = text.match(/#(\w+)/);
    const category = categoryMatch ? categoryMatch[1] : undefined;

    // Extract all hashtags as tags
    const tags = Array.from(text.matchAll(/#(\w+)/g)).map(match => match[1]);

    // Get first image if available
    const imageUrl = message.media?.find(m => m.type === 'photo')?.url;

    return {
      title,
      content,
      excerpt,
      category,
      tags,
      imageUrl,
    };
  }

  /**
   * Upsert news item to database
   */
  private async upsertNewsItem(message: TelegramMessage): Promise<void> {
    try {
      const parsed = this.parseMessage(message);
      const sourceUrl = `${TELEGRAM_CHANNEL_URL}/${message.id}`;

      // Check if news item already exists
      const existing = await db.query.newsFeed.findFirst({
        where: eq(newsFeed.sourceUrl, sourceUrl),
      });

      if (existing) {
        // Update existing news item
        await db
          .update(newsFeed)
          .set({
            title: parsed.title,
            content: parsed.content,
            excerpt: parsed.excerpt,
            category: parsed.category,
            imageUrl: parsed.imageUrl,
            publishedAt: message.date,
          })
          .where(eq(newsFeed.id, existing.id));
        
        console.log(`✅ Updated news: ${parsed.title}`);
      } else {
        // Insert new news item
        await db.insert(newsFeed).values({
          title: parsed.title,
          content: parsed.content,
          excerpt: parsed.excerpt,
          source: 'telegram',
          category: parsed.category,
          sourceUrl,
          imageUrl: parsed.imageUrl,
          publishedAt: message.date,
        });
        
        console.log(`✅ Created news: ${parsed.title}`);
      }
    } catch (error) {
      console.error(`❌ Error upserting news item:`, error);
      throw error;
    }
  }

  /**
   * Sync messages from Telegram channel
   */
  async syncMessages(limit: number = 50): Promise<SyncResult> {
    console.log('🔄 Starting Telegram news sync...');
    
    try {
      const messages = await this.fetchMessagesFromChannel(limit);
      
      if (messages.length === 0) {
        console.log('⚠️  No messages found');
        return { synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      for (const message of messages) {
        try {
          await this.upsertNewsItem(message);
          synced++;
        } catch (error) {
          console.error(`❌ Error syncing message ${message.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Sync complete: ${synced} synced, ${errors} errors`);
      return { 
        synced, 
        errors, 
        lastMessageId: messages[messages.length - 1]?.id 
      };
    } catch (error) {
      console.error('❌ Error in syncMessages:', error);
      throw error;
    }
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    console.log(`⏰ Starting auto-sync (interval: ${this.syncInterval}ms)`);
    
    this.syncTimer = setInterval(async () => {
      try {
        console.log('⏰ Running scheduled Telegram sync...');
        await this.syncMessages();
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, this.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹️  Auto-sync stopped');
    }
  }
}

// Export singleton instance
export const telegramSync = new TelegramSyncService();

// Auto-sync if enabled
if (process.env.ENABLE_TELEGRAM_AUTO_SYNC === 'true') {
  const syncInterval = parseInt(process.env.TELEGRAM_SYNC_INTERVAL || '300000'); // Default 5 minutes
  
  console.log(`⏰ Telegram auto-sync enabled (interval: ${syncInterval}ms)`);
  
  // Initialize with auto-sync
  setTimeout(() => {
    telegramSync.initialize(
      process.env.TELEGRAM_BOT_TOKEN,
      true,
      syncInterval
    ).catch(console.error);
  }, 5000); // Wait 5 seconds after startup
}

export default telegramSync;
