/**
 * Fixed-window rate limiting backed by the shared KV store.
 */

import { TRPCError } from "@trpc/server";
import { kv } from "./kv";

interface RateLimitOptions {
  /** Logical bucket name, e.g. "auth.getNonce" */
  bucket: string;
  /** Caller identity: IP address, user id, or wallet address */
  key: string;
  /** Maximum requests allowed per window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
}

/**
 * Throws TOO_MANY_REQUESTS when the caller exceeds `limit` requests
 * within the current window.
 */
export async function assertRateLimit({
  bucket,
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<void> {
  try {
    const count = await kv.incr(`ratelimit:${bucket}:${key}`, windowMs);
    if (count > limit) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    // A broken rate-limit backend should not take down the endpoint
    console.error("[rateLimit] backend error:", error);
  }
}
