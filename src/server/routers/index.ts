import { router } from "../_core/trpc";
import { authRouter } from "./auth";
import { grantsRouter } from "./grants";
import { newsRouter } from "./news";

export const appRouter = router({
  auth: authRouter,
  grants: grantsRouter,
  news: newsRouter,
});

export type AppRouter = typeof appRouter;
