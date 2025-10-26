import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

// Placeholder router - will be connected to database in production
export const grantsRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      // TODO: Connect to database
      // For now, return mock data
      return {
        grants: [],
        total: 0,
        hasMore: false,
      };
    }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // TODO: Connect to database
      return null;
    }),
  
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(10).max(200),
      description: z.string().min(50),
      fundingRequest: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Connect to database
      return { success: true, id: 1 };
    }),
});

