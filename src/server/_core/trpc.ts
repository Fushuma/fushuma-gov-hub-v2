import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";
import superjson from "superjson";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action. Please connect your wallet."
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action. Please connect your wallet."
    });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ 
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action. Admin access required."
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
