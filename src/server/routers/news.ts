import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { db } from "@/db";
import { sql, eq, desc, and, isNull, like, or } from "drizzle-orm";
import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";

// Define the news table schema (from V1)
export const news = mysqlTable("news", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  author: varchar("author", { length: 255 }),
  publishedAt: timestamp("publishedAt").notNull(),
  source: mysqlEnum("source", ["telegram", "manual", "github", "official"]).notNull(),
  sourceId: varchar("sourceId", { length: 255 }),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  category: varchar("category", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  isPinned: int("isPinned").default(0),
  viewCount: int("viewCount").default(0),
  metadata: json("metadata").$type<{
    media?: Array<{ url: string; type: string }>;
    links?: string[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const newsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        category: z.string().optional(),
        source: z.enum(["telegram", "manual", "github", "official"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, offset, category, source } = input;
      
      const conditions = [];
      if (category) {
        conditions.push(eq(news.category, category));
      }
      if (source) {
        conditions.push(eq(news.source, source));
      }
      
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      
      const items = await db
        .select()
        .from(news)
        .where(where)
        .orderBy(desc(news.publishedAt))
        .limit(limit)
        .offset(offset);
      
      return items;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await db
        .select()
        .from(news)
        .where(eq(news.id, input.id))
        .limit(1);
      
      if (item.length === 0) {
        throw new Error("News item not found");
      }

      // Increment view count
      await db
        .update(news)
        .set({ viewCount: sql`${news.viewCount} + 1` })
        .where(eq(news.id, input.id));
      
      return item[0];
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        author: z.string().optional(),
        source: z.enum(["telegram", "manual", "github", "official"]),
        sourceUrl: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.object({
          media: z.array(z.object({
            url: z.string(),
            type: z.string(),
          })).optional(),
          links: z.array(z.string()).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(news).values({
        ...input,
        publishedAt: new Date(),
      });
      
      return { id: Number(result[0].insertId) };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        category: z.string().optional(),
        isPinned: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      
      await db
        .update(news)
        .set(updates)
        .where(eq(news.id, id));
      
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(news)
        .where(eq(news.id, input.id));
      
      return { success: true };
    }),

  incrementView: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(news)
        .set({ viewCount: sql`${news.viewCount} + 1` })
        .where(eq(news.id, input.id));
      
      return { success: true };
    }),
});
