import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  generateNonce,
  generateSignInMessage,
  verifyNonce,
  verifyWalletSignature,
  isValidEthereumAddress,
  clearNonce,
} from "../_core/web3Auth";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { TRPCError } from "@trpc/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fushuma-secret-key-change-in-production"
);

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  getNonce: publicProcedure
    .input(z.object({ address: z.string() }))
    .mutation(({ input }) => {
      if (!isValidEthereumAddress(input.address)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Ethereum address",
        });
      }
      const nonce = generateNonce(input.address);
      const message = generateSignInMessage(input.address, nonce);
      return { nonce, message };
    }),

  signIn: publicProcedure
    .input(
      z.object({
        address: z.string(),
        signature: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { address, signature, message } = input;

      if (!isValidEthereumAddress(address)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Ethereum address",
        });
      }

      const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
      if (!nonceMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid message format",
        });
      }

      const nonce = nonceMatch[1];
      if (!verifyNonce(address, nonce)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired nonce",
        });
      }

      const isValid = await verifyWalletSignature(address, message, signature);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid signature",
        });
      }

      clearNonce(address);

      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.walletAddress, address.toLowerCase()))
        .limit(1);

      if (!user) {
        [user] = await ctx.db
          .insert(users)
          .values({
            walletAddress: address.toLowerCase(),
            role: "user",
            lastSignedIn: new Date(),
          })
          .$returningId()
          .then(async (ids) => {
            return ctx.db
              .select()
              .from(users)
              .where(eq(users.id, ids[0].id))
              .limit(1);
          });
      } else {
        await ctx.db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));
      }

      const token = await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          role: user.role,
        },
      };
    }),

  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(64).optional(),
        displayName: z.string().max(128).optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
