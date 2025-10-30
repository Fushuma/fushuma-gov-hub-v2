import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { launchpadProjects } from "@/db/schema";
import { eq, desc, and, isNull, like, or } from "drizzle-orm";

export const launchpadRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        status: z.enum(["submitted", "review", "voting", "approved", "fundraising", "launched", "rejected"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      
      const where = and(
        isNull(launchpadProjects.deletedAt),
        status ? eq(launchpadProjects.status, status) : undefined
      );
      
      const projects = await ctx.db
        .select()
        .from(launchpadProjects)
        .where(where)
        .orderBy(desc(launchpadProjects.createdAt))
        .limit(limit)
        .offset(offset);
      
      return projects;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [project] = await ctx.db
        .select()
        .from(launchpadProjects)
        .where(
          and(
            eq(launchpadProjects.id, input.id),
            isNull(launchpadProjects.deletedAt)
          )
        )
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(255),
        description: z.string().min(50).max(10000),
        teamBackground: z.string().min(50).max(5000).optional(),
        tokenomics: z.string().min(50).max(5000).optional(),
        roadmap: z.string().min(50).max(5000).optional(),
        fundingAmount: z.number().int().positive(),
        airdropAllocation: z.number().int().positive().optional(),
        websiteUrl: z.string().url().optional(),
        tokenSymbol: z.string().min(1).max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [result] = await ctx.db
        .insert(launchpadProjects)
        .values({
          ...input,
          submittedBy: ctx.user.id,
          status: "submitted",
        })
        .$returningId();
      
      return { success: true, id: result.id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(5).max(255).optional(),
        description: z.string().min(50).max(10000).optional(),
        teamBackground: z.string().min(50).max(5000).optional(),
        tokenomics: z.string().min(50).max(5000).optional(),
        roadmap: z.string().min(50).max(5000).optional(),
        fundingAmount: z.number().int().positive().optional(),
        airdropAllocation: z.number().int().positive().optional(),
        websiteUrl: z.string().url().optional(),
        tokenSymbol: z.string().min(1).max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      // Check if user owns this project
      const [project] = await ctx.db
        .select()
        .from(launchpadProjects)
        .where(eq(launchpadProjects.id, id))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      if (project.submittedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      
      await ctx.db
        .update(launchpadProjects)
        .set(updateData)
        .where(eq(launchpadProjects.id, id));
      
      return { success: true };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["submitted", "review", "voting", "approved", "fundraising", "launched", "rejected"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(launchpadProjects)
        .set({ status: input.status })
        .where(eq(launchpadProjects.id, input.id));
      
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      // Soft delete
      await ctx.db
        .update(launchpadProjects)
        .set({ deletedAt: new Date() })
        .where(eq(launchpadProjects.id, input.id));
      
      return { success: true };
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
      
      const projects = await ctx.db
        .select()
        .from(launchpadProjects)
        .where(
          and(
            isNull(launchpadProjects.deletedAt),
            or(
              like(launchpadProjects.title, `%${query}%`),
              like(launchpadProjects.description, `%${query}%`),
              like(launchpadProjects.tokenSymbol, `%${query}%`)
            )
          )
        )
        .orderBy(desc(launchpadProjects.createdAt))
        .limit(limit);
      
      return projects;
    }),

  getFeatured: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).optional().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const projects = await ctx.db
        .select()
        .from(launchpadProjects)
        .where(
          and(
            isNull(launchpadProjects.deletedAt),
            or(
              eq(launchpadProjects.status, "fundraising"),
              eq(launchpadProjects.status, "launched")
            )
          )
        )
        .orderBy(desc(launchpadProjects.createdAt))
        .limit(input.limit);
      
      return projects;
    }),
});
