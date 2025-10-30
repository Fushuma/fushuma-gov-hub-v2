import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fushuma-secret-key-change-in-production"
);

export type User = {
  id: number;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  role: "user" | "admin";
};

export async function createContext(req: NextRequest) {
  const sessionToken = req.cookies.get("fushuma_session")?.value;
  
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
  
  return { user, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
