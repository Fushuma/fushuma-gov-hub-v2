import { router } from "../_core/trpc";
import { authRouter } from "./auth";
import { grantsRouter } from "./grants";
import { newsRouter } from "./news";
import { launchpadRouter } from "./launchpad";
import { proposalsRouter } from "./proposals";
import { defiRouter } from "./defi";

export const appRouter = router({
  auth: authRouter,
  grants: grantsRouter,
  news: newsRouter,
  launchpad: launchpadRouter,
  proposals: proposalsRouter,
  defi: defiRouter,
});

export type AppRouter = typeof appRouter;
