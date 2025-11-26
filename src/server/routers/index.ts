import { router } from "../_core/trpc";
import { authRouter } from "./auth";
import { grantsRouter } from "./grants";
import { newsRouter } from "./news";
import { launchpadRouter } from "./launchpad";
import { proposalsRouter } from "./proposals";
import { defiRouter } from "./defi";
import { delegatesRouter } from "./delegates";

export const appRouter = router({
  auth: authRouter,
  grants: grantsRouter,
  news: newsRouter,
  launchpad: launchpadRouter,
  proposals: proposalsRouter,
  defi: defiRouter,
  delegates: delegatesRouter,
});

export type AppRouter = typeof appRouter;
