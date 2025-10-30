import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { developmentGrants } from "@/db/schema";
import { eq, desc, and, isNull, like, or } from "drizzle-orm";
import { githubSync } from "../services/github-sync";

export const grantsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        status: z.enum(["submitted", "review", "approved", "in_progress", "completed", "rejected"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      
      const where = and(
        isNull(developmentGrants.deletedAt),
        status ? eq(developmentGrants.status, status) : undefined
      );
      
      const grants = await ctx.db
        .select()
        .from(developmentGrants)
        .where(where)
        .orderBy(desc(developmentGrants.createdAt))
        .limit(limit)
        .offset(offset);
      
      return grants;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [grant] = await ctx.db
        .select()
        .from(developmentGrants)
        .where(
          and(
            eq(developmentGrants.id, input.id),
            isNull(developmentGrants.deletedAt)
          )
        )
        .limit(1);
      
      if (!grant) {
        throw new Error("Grant not found");
      }
      
      return grant;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(255),
        applicantName: z.string().min(2).max(255),
        contactInfo: z.string().max(255).optional(),
        description: z.string().min(50).max(10000),
        valueProposition: z.string().min(50).max(5000),
        deliverables: z.string().min(50).max(5000),
        roadmap: z.string().min(50).max(5000),
        fundingRequest: z.number().int().positive(),
        receivingWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [result] = await ctx.db
        .insert(developmentGrants)
        .values({
          ...input,
          submittedBy: ctx.user.id,
          status: "submitted",
        })
        .$returningId();
      
      return { success: true, id: result.id };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["submitted", "review", "approved", "in_progress", "completed", "rejected"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(developmentGrants)
        .set({ status: input.status })
        .where(eq(developmentGrants.id, input.id));
      
      return { success: true };
    }),

  // GitHub sync endpoints
  syncFromGitHub: adminProcedure
    .mutation(async () => {
      const result = await githubSync.syncAllGrants();
      return result;
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, limit } = input;
      
      const grants = await ctx.db
        .select()
        .from(developmentGrants)
        .where(
          and(
            isNull(developmentGrants.deletedAt),
            or(
              like(developmentGrants.title, `%${query}%`),
              like(developmentGrants.description, `%${query}%`),
              like(developmentGrants.applicantName, `%${query}%`)
            )
          )
        )
        .orderBy(desc(developmentGrants.createdAt))
        .limit(limit);
      
      return grants;
    }),
});
