import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { verifyMessage } from 'viem';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// In-memory nonce store (use Redis in production)
const nonceStore = new Map<string, { nonce: string; timestamp: number }>();

// Clean up old nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { // 5 minutes
      nonceStore.delete(address);
    }
  }
}, 5 * 60 * 1000);

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  
  getNonce: publicProcedure
    .input(z.object({ address: z.string() }))
    .mutation(({ input }) => {
      const { address } = input;
      const nonce = nanoid();
      nonceStore.set(address.toLowerCase(), { nonce, timestamp: Date.now() });
      
      const message = `Sign this message to authenticate with Fushuma Governance Hub.\n\nNonce: ${nonce}`;
      
      return { nonce, message };
    }),
  
  verifySignature: publicProcedure
    .input(z.object({
      address: z.string(),
      signature: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { address, signature, message } = input;
      
      // Verify signature
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // Extract and verify nonce
      const nonceMatch = message.match(/Nonce: ([^\n]+)/);
      if (!nonceMatch) {
        throw new Error('Invalid message format');
      }
      
      const nonce = nonceMatch[1];
      const storedData = nonceStore.get(address.toLowerCase());
      
      if (!storedData || storedData.nonce !== nonce) {
        throw new Error('Invalid or expired nonce');
      }
      
      // Remove used nonce
      nonceStore.delete(address.toLowerCase());
      
      // Create session token
      const sessionToken = await new SignJWT({
        openId: address.toLowerCase(),
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        isAdmin: address.toLowerCase() === process.env.ADMIN_WALLET_ADDRESS?.toLowerCase(),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(JWT_SECRET);
      
      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      
      return {
        success: true,
        address: address.toLowerCase(),
      };
    }),
  
  logout: publicProcedure.mutation(async () => {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return { success: true };
  }),
});

