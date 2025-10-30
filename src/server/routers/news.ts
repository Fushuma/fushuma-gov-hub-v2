import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { db } from "@/db";
import { sql, eq, desc, and } from "drizzle-orm";
import { newsFeed } from "@/db/schema";

export const newsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        category: z.string().optional(),
        source: z.enum(["official", "telegram", "github", "partner", "community"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, offset, category, source } = input;
      
      const conditions = [];
      if (category) {
        conditions.push(eq(newsFeed.category, category));
      }
      if (source) {
        conditions.push(eq(newsFeed.source, source));
      }
      
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      
      const items = await db
        .select()
        .from(newsFeed)
        .where(where)
        .orderBy(desc(newsFeed.publishedAt))
        .limit(limit)
        .offset(offset);
      
      return items;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await db
        .select()
        .from(newsFeed)
        .where(eq(newsFeed.id, input.id))
        .limit(1);
      
      if (item.length === 0) {
        throw new Error("News item not found");
      }
      
      return item[0];
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        source: z.enum(["official", "telegram", "github", "partner", "community"]),
        sourceUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(newsFeed).values({
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
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      
      await db
        .update(newsFeed)
        .set(updates)
        .where(eq(newsFeed.id, id));
      
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(newsFeed)
        .where(eq(newsFeed.id, input.id));
      
      return { success: true };
    }),


});
