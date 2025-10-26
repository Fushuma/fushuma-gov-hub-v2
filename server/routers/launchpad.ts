import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

// Placeholder router - will be connected to database in production
export const launchpadRouter = router({
  list: publicProcedure.query(async () => {
    // TODO: Connect to database
    return [];
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
      fundingAmount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Connect to database
      return { success: true, id: 1 };
    }),
});

