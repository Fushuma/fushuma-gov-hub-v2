import { initTRPC, TRPCError } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function createContext(opts: FetchCreateContextFnOptions) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  let user = null;
  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
      user = {
        id: payload.sub as string,
        openId: payload.openId as string,
        name: payload.name as string,
        isAdmin: payload.isAdmin as boolean || false,
      };
    } catch (error) {
      // Invalid token, user remains null
      console.error('JWT verification failed:', error);
    }
  }
  
  return {
    user,
    headers: opts.req.headers,
  };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.user.isAdmin) {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'You must be an admin to perform this action',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

