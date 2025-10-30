import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { newsFeed as news } from "@/db/schema";
import { eq, desc, and, isNull, like, or } from "drizzle-orm";
import { telegramSync } from "../services/telegram-sync";

export const newsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        category: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset, category } = input;
      
      const where = and(
        isNull(news.deletedAt),
        category ? eq(news.category, category) : undefined
      );
      
      const items = await ctx.db
        .select()
        .from(news)
        .where(where)
        .orderBy(desc(news.publishedAt))
        .limit(limit)
        .offset(offset);
      
      return items;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [item] = await ctx.db
        .select()
        .from(news)
        .where(
          and(
            eq(news.id, input.id),
            isNull(news.deletedAt)
          )
        )
        .limit(1);
      
      if (!item) {
        throw new Error("News not found");
      }
      
      return item;
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.select().from(news);
    
    const categoryCounts = items.reduce((acc, item) => {
      const cat = item.category || "uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count,
    }));
  }),

  getTrending: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).optional().default(5),
        days: z.number().min(1).max(30).optional().default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      const items = await ctx.db
        .select()
        .from(news)
        .where(isNull(news.deletedAt))
        .orderBy(desc(news.publishedAt))
        .limit(input.limit);
      
      return items;
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const searchTerm = `%${input.query}%`;
      
      const items = await ctx.db
        .select()
        .from(news)
        .where(
          and(
            isNull(news.deletedAt),
            or(
              like(news.title, searchTerm),
              like(news.content, searchTerm),
              like(news.excerpt, searchTerm)
            )
          )
        )
        .limit(input.limit);
      
      return items;
    }),

  // Telegram sync endpoint
  syncFromTelegram: adminProcedure
    .mutation(async () => {
      const result = await telegramSync.syncMessages();
      return result;
    }),
});
