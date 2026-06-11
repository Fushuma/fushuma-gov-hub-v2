import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { proposals, proposalVotes } from "@/db/schema";
import { eq, desc, and, isNull, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { assertRateLimit } from "../_core/rateLimit";

export const proposalsRouter = router({
  // Sync proposals from blockchain
  sync: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Lazy import to avoid initialization issues
        const { indexProposals, updateProposalStates } = await import("../services/governance-indexer");
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
        // Lazy import to avoid initialization issues
        const { getProposalFromContract } = await import("../services/governance-indexer");
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRateLimit({
        bucket: "proposals.vote",
        key: String(ctx.user.id),
        limit: 20,
        windowMs: 60 * 1000,
      });

      // Check if proposal exists and is active
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(eq(proposals.id, input.proposalId))
        .limit(1);

      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      if (proposal.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Proposal is not active for voting",
        });
      }

      // Voting power is read from the VotingEscrow contract - never
      // trusted from client input
      if (!ctx.user.walletAddress) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "A wallet address is required to vote",
        });
      }

      let votingPower: number;
      try {
        const { getVotingPowerTokens } = await import("../services/voting-power");
        votingPower = await getVotingPowerTokens(ctx.user.walletAddress);
      } catch (error) {
        console.error("Failed to read voting power from chain:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not verify voting power. Please try again.",
        });
      }

      if (votingPower <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need voting power (locked WFUMA) to vote on proposals",
        });
      }

      try {
        // Transaction keeps the vote row and the tally consistent; the
        // unique index on (proposalId, userId) makes double-voting
        // impossible even under concurrent requests
        await ctx.db.transaction(async (tx) => {
          await tx.insert(proposalVotes).values({
            userId: ctx.user.id,
            proposalId: input.proposalId,
            voterAddress: ctx.user.walletAddress!,
            voteChoice: input.voteChoice,
            votingPower,
          });

          const tallyColumn =
            input.voteChoice === "for"
              ? proposals.votesFor
              : input.voteChoice === "against"
                ? proposals.votesAgainst
                : proposals.votesAbstain;

          await tx
            .update(proposals)
            .set({
              [input.voteChoice === "for"
                ? "votesFor"
                : input.voteChoice === "against"
                  ? "votesAgainst"
                  : "votesAbstain"]: sql`${tallyColumn} + ${votingPower}`,
              totalVotes: sql`${proposals.totalVotes} + ${votingPower}`,
            })
            .where(eq(proposals.id, input.proposalId));
        });
      } catch (error: unknown) {
        // MySQL duplicate key on the unique (proposalId, userId) index;
        // drizzle may wrap the mysql2 error, so walk the cause chain
        let cause: unknown = error;
        while (cause instanceof Error) {
          if ((cause as { code?: string }).code === "ER_DUP_ENTRY") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "You have already voted on this proposal",
            });
          }
          cause = cause.cause;
        }
        throw error;
      }

      return { success: true, votingPower };
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
