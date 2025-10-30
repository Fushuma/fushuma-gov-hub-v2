import { Octokit } from '@octokit/rest';
import { db } from '@/db';
import { developmentGrants } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: Array<{ name: string }>;
  user: {
    login: string;
    avatar_url: string;
  } | null;
}

export class GitHubGrantsSync {
  private octokit: Octokit;
  private owner = 'Fushuma';
  private repo = 'Dev_grants';

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Fetch all grant issues from GitHub
   */
  async fetchGrantIssues(): Promise<GitHubIssue[]> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'all',
        per_page: 100,
      });

      return data as GitHubIssue[];
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      throw error;
    }
  }

  /**
   * Parse grant information from issue body
   */
  parseGrantIssue(issue: GitHubIssue) {
    const body = issue.body || '';
    
    // Extract amount requested (look for patterns like "$10,000" or "10000 FUMA")
    const amountMatch = body.match(/\$?([\d,]+)\s*(FUMA|USD)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Determine status from labels and state
    let status: 'submitted' | 'review' | 'approved' | 'in_progress' | 'completed' | 'rejected' = 'submitted';
    
    const labelNames = issue.labels.map(l => l.name.toLowerCase());
    
    if (labelNames.includes('completed')) {
      status = 'completed';
    } else if (labelNames.includes('in progress') || labelNames.includes('in_progress')) {
      status = 'in_progress';
    } else if (labelNames.includes('approved')) {
      status = 'approved';
    } else if (labelNames.includes('rejected')) {
      status = 'rejected';
    } else if (labelNames.includes('review') || labelNames.includes('in review')) {
      status = 'review';
    }

    // Extract description
    const description = body.substring(0, 2000);

    return {
      githubIssueNumber: issue.number,
      title: issue.title,
      description,
      amount,
      status,
      applicant: issue.user?.login || 'unknown',
      applicantAvatar: issue.user?.avatar_url || '',
      githubUrl: issue.html_url,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
    };
  }

  /**
   * Sync a single grant to database
   */
  async upsertGrant(grantData: ReturnType<typeof this.parseGrantIssue>) {
    try {
      // Check if grant already exists by GitHub URL
      const existing = await db.query.developmentGrants.findFirst({
        where: eq(developmentGrants.githubIssueUrl, grantData.githubUrl),
      });

      if (existing) {
        // Update existing grant
        await db
          .update(developmentGrants)
          .set({
            title: grantData.title,
            description: grantData.description,
            applicantName: grantData.applicant,
            fundingRequest: grantData.amount,
            status: grantData.status,
            updatedAt: new Date(),
          })
          .where(eq(developmentGrants.id, existing.id));
        
        console.log(`Updated grant #${grantData.githubIssueNumber}: ${grantData.title}`);
        return existing.id;
      } else {
        // Insert new grant
        const result = await db
          .insert(developmentGrants)
          .values({
            title: grantData.title,
            description: grantData.description,
            applicantName: grantData.applicant,
            contactInfo: grantData.githubUrl,
            valueProposition: grantData.description,
            deliverables: '',
            roadmap: '',
            fundingRequest: grantData.amount,
            status: grantData.status,
            submittedBy: 1, // System user
            githubIssueUrl: grantData.githubUrl,
          });
        
        console.log(`Created grant #${grantData.githubIssueNumber}: ${grantData.title}`);
        return Number(result[0].insertId);
      }
    } catch (error) {
      console.error(`Error upserting grant #${grantData.githubIssueNumber}:`, error);
      throw error;
    }
  }

  /**
   * Sync all grants from GitHub
   */
  async syncAllGrants(): Promise<{ synced: number; errors: number }> {
    console.log('Starting GitHub grants sync...');
    
    try {
      const issues = await this.fetchGrantIssues();
      console.log(`Found ${issues.length} issues in GitHub`);

      let synced = 0;
      let errors = 0;

      for (const issue of issues) {
        try {
          const grantData = this.parseGrantIssue(issue);
          await this.upsertGrant(grantData);
          synced++;
        } catch (error) {
          console.error(`Error syncing issue #${issue.number}:`, error);
          errors++;
        }
      }

      console.log(`Sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error('Error in syncAllGrants:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const githubSync = new GitHubGrantsSync();
