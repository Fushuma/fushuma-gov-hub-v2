import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers";
import superjson from "superjson";
import { cookies } from "next/headers";

export const serverClient = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("fushuma_session")?.value;
  
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/trpc`,
        transformer: superjson,
        headers() {
          return {
            cookie: sessionCookie ? `fushuma_session=${sessionCookie}` : "",
          };
        },
      }),
    ],
  });
};
