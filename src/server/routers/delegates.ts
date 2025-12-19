import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { db } from "@/db";
import { delegates, delegations } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * Delegates Router
 *
 * API endpoints for delegate discovery and management
 */

export const delegatesRouter = router({
  /**
   * Get all delegates with pagination
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        orderBy: z.enum(["votingPower", "delegatorCount", "createdAt"]).default("votingPower"),
      })
    )
    .query(async ({ input }) => {
      const { limit, offset, orderBy } = input;

      const orderColumn = {
        votingPower: delegates.votingPower,
        delegatorCount: delegates.delegatorCount,
        createdAt: delegates.createdAt,
      }[orderBy];

      const results = await db
        .select()
        .from(delegates)
        .orderBy(desc(orderColumn))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(delegates);

      return {
        delegates: results,
        total: Number(count),
      };
    }),

  /**
   * Get a specific delegate by address
   */
  getByAddress: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const [delegate] = await db
        .select()
        .from(delegates)
        .where(eq(delegates.address, input.address.toLowerCase()))
        .limit(1);

      return delegate || null;
    }),

  /**
   * Get delegations for a specific delegate
   */
  getDelegations: publicProcedure
    .input(
      z.object({
        delegateAddress: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const { delegateAddress, limit, offset } = input;

      const results = await db
        .select()
        .from(delegations)
        .where(eq(delegations.delegate, delegateAddress.toLowerCase()))
        .orderBy(desc(delegations.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    }),

  /**
   * Get user's current delegation
   */
  getUserDelegation: publicProcedure
    .input(z.object({ userAddress: z.string() }))
    .query(async ({ input }) => {
      const [delegation] = await db
        .select()
        .from(delegations)
        .where(eq(delegations.delegator, input.userAddress.toLowerCase()))
        .orderBy(desc(delegations.createdAt))
        .limit(1);

      return delegation || null;
    }),

  /**
   * Register as a delegate
   */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        bio: z.string().max(1000).optional(),
        twitterHandle: z.string().max(100).optional(),
        websiteUrl: z.string().url().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userAddress = ctx.user.walletAddress?.toLowerCase();
      if (!userAddress) {
        throw new Error("Wallet address required to register as delegate");
      }

      // Check if already registered
      const [existing] = await db
        .select()
        .from(delegates)
        .where(eq(delegates.address, userAddress))
        .limit(1);

      if (existing) {
        // Update existing delegate profile
        await db
          .update(delegates)
          .set({
            name: input.name,
            bio: input.bio,
            twitterHandle: input.twitterHandle,
            websiteUrl: input.websiteUrl,
          })
          .where(eq(delegates.address, userAddress));

        return { success: true, updated: true };
      }

      // Create new delegate profile
      await db.insert(delegates).values({
        address: userAddress,
        name: input.name,
        bio: input.bio,
        twitterHandle: input.twitterHandle,
        websiteUrl: input.websiteUrl,
        votingPower: 0,
        delegatorCount: 0,
      });

      return { success: true, updated: false };
    }),

  /**
   * Search delegates by name or address
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      const searchQuery = `%${input.query.toLowerCase()}%`;

      const results = await db
        .select()
        .from(delegates)
        .where(
          sql`LOWER(${delegates.name}) LIKE ${searchQuery} OR LOWER(${delegates.address}) LIKE ${searchQuery}`
        )
        .orderBy(desc(delegates.votingPower))
        .limit(input.limit);

      return results;
    }),

  /**
   * Get top delegates by voting power
   */
  getTopDelegates: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const results = await db
        .select()
        .from(delegates)
        .orderBy(desc(delegates.votingPower))
        .limit(input.limit);

      return results;
    }),
});

export type DelegatesRouter = typeof delegatesRouter;
