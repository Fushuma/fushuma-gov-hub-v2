import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { createContext } from "@/server/_core/context";
import { NextRequest } from "next/server";

/**
 * CSRF defense-in-depth: the session cookie is SameSite=Lax (browsers do
 * not attach it to cross-site POSTs), and on top of that we reject
 * mutating requests whose Origin header does not match the host.
 */
function hasValidOrigin(req: NextRequest): boolean {
  if (req.method !== "POST") return true;
  const origin = req.headers.get("origin");
  // Non-browser clients (no Origin header) don't carry ambient cookies
  if (!origin) return true;
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

const handler = (req: NextRequest) => {
  if (!hasValidOrigin(req)) {
    return new Response(JSON.stringify({ error: "Invalid origin" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => createContext(req, resHeaders),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
