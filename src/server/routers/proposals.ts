import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { proposals, proposalVotes } from "@/db/schema";
import { eq, desc, and, isNull, like, or, sql } from "drizzle-orm";
import { indexProposals, updateProposalStates, getProposalFromContract } from "../services/governance-indexer";

export const proposalsRouter = router({
  // Sync proposals from blockchain
  sync: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const indexed = await indexProposals();
        await updateProposalStates();
        return { success: true, count: indexed.length };
      } catch (error) {
        console.error('Error syncing proposals:', error);
        throw new Error('Failed to sync proposals from blockchain');
      }
    }),

  // Get proposal from blockchain by ID
  getFromChain: publicProcedure
    .input(z.object({ proposalId: z.string() }))
    .query(async ({ input }) => {
      try {
        const proposal = await getProposalFromContract(BigInt(input.proposalId));
        return proposal;
      } catch (error) {
        console.error('Error fetching proposal from chain:', error);
        throw new Error('Failed to fetch proposal from blockchain');
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        status: z.enum(["pending", "active", "passed", "rejected", "executed", "cancelled"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      
      const where = and(
        isNull(proposals.deletedAt),
        status ? eq(proposals.status, status) : undefined
      );
      
      const proposalsList = await ctx.db
        .select()
        .from(proposals)
        .where(where)
        .orderBy(desc(proposals.createdAt))
        .limit(limit)
        .offset(offset);
      
      return proposalsList;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.id),
            isNull(proposals.deletedAt)
          )
        )
        .limit(1);
      
      if (!proposal) {
        throw new Error("Proposal not found");
      }
      
      return proposal;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(500),
        description: z.string().min(50).max(10000),
        quorum: z.number().int().positive().optional().default(100),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startDate = input.startDate || new Date();
      const endDate = input.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const [result] = await ctx.db
        .insert(proposals)
        .values({
          title: input.title,
          description: input.description,
          proposer: ctx.user.walletAddress || `user_${ctx.user.id}`,
          proposerUserId: ctx.user.id,
          status: "pending",
          quorum: input.quorum,
          startDate: startDate,
          endDate: endDate,
        })
        .$returningId();
      
      return { success: true, id: result.id };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["pending", "active", "passed", "rejected", "executed", "cancelled"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(proposals)
        .set({ status: input.status })
        .where(eq(proposals.id, input.id));
      
      return { success: true };
    }),

  vote: protectedProcedure
    .input(
      z.object({
        proposalId: z.number().int().positive(),
        voteChoice: z.enum(["for", "against", "abstain"]),
        votingPower: z.number().int().positive().optional().default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if proposal exists and is active
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(eq(proposals.id, input.proposalId))
        .limit(1);
      
      if (!proposal) {
        throw new Error("Proposal not found");
      }
      
      if (proposal.status !== "active") {
        throw new Error("Proposal is not active for voting");
      }
      
      // Check if user has already voted
      const [existingVote] = await ctx.db
        .select()
        .from(proposalVotes)
        .where(
          and(
            eq(proposalVotes.userId, ctx.user.id),
            eq(proposalVotes.proposalId, input.proposalId)
          )
        )
        .limit(1);
      
      if (existingVote) {
        throw new Error("You have already voted on this proposal");
      }
      
      // Record the vote
      await ctx.db.insert(proposalVotes).values({
        userId: ctx.user.id,
        proposalId: input.proposalId,
        voterAddress: ctx.user.walletAddress || `user_${ctx.user.id}`,
        voteChoice: input.voteChoice,
        votingPower: input.votingPower,
      });
      
      // Update proposal vote counts based on vote choice
      if (input.voteChoice === "for") {
        await ctx.db
          .update(proposals)
          .set({
            votesFor: sql`${proposals.votesFor} + ${input.votingPower}`,
            totalVotes: sql`${proposals.totalVotes} + ${input.votingPower}`
          })
          .where(eq(proposals.id, input.proposalId));
      } else if (input.voteChoice === "against") {
        await ctx.db
          .update(proposals)
          .set({
            votesAgainst: sql`${proposals.votesAgainst} + ${input.votingPower}`,
            totalVotes: sql`${proposals.totalVotes} + ${input.votingPower}`
          })
          .where(eq(proposals.id, input.proposalId));
      } else if (input.voteChoice === "abstain") {
        await ctx.db
          .update(proposals)
          .set({
            votesAbstain: sql`${proposals.votesAbstain} + ${input.votingPower}`,
            totalVotes: sql`${proposals.totalVotes} + ${input.votingPower}`
          })
          .where(eq(proposals.id, input.proposalId));
      }

      return { success: true };
    }),

  getVotes: publicProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const votesList = await ctx.db
        .select()
        .from(proposalVotes)
        .where(eq(proposalVotes.proposalId, input.proposalId))
        .orderBy(desc(proposalVotes.createdAt));
      
      return votesList;
    }),

  getUserVote: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [vote] = await ctx.db
        .select()
        .from(proposalVotes)
        .where(
          and(
            eq(proposalVotes.userId, ctx.user.id),
            eq(proposalVotes.proposalId, input.proposalId)
          )
        )
        .limit(1);
      
      return vote || null;
    }),

  getActive: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const activeProposals = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            isNull(proposals.deletedAt),
            eq(proposals.status, "active")
          )
        )
        .orderBy(desc(proposals.endDate))
        .limit(input.limit);
      
      return activeProposals;
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
      
      const proposalsList = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            isNull(proposals.deletedAt),
            or(
              like(proposals.title, `%${query}%`),
              like(proposals.description, `%${query}%`),
              like(proposals.proposer, `%${query}%`)
            )
          )
        )
        .orderBy(desc(proposals.createdAt))
        .limit(limit);
      
      return proposalsList;
    }),
});
