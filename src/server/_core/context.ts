import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "./jwtSecret";
import { SESSION_COOKIE_NAME } from "./sessionCookie";

export type User = {
  id: number;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  role: "user" | "admin";
};

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function createContext(req: NextRequest, resHeaders?: Headers) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let user: User | null = null;

  if (sessionToken) {
    try {
      const verified = await jwtVerify(sessionToken, JWT_SECRET);
      const userId = verified.payload.userId as number;

      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (dbUser) {
        user = {
          id: dbUser.id,
          walletAddress: dbUser.walletAddress,
          username: dbUser.username,
          displayName: dbUser.displayName,
          avatar: dbUser.avatar,
          role: dbUser.role,
        };
      }
    } catch (error) {
      console.error("Session verification failed:", error);
    }
  }

  return { user, db, resHeaders, ip: getClientIp(req) };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
