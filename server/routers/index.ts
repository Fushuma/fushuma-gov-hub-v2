import { router } from '../trpc';
import { authRouter } from './auth';
import { grantsRouter } from './grants';
import { governanceRouter } from './governance';
import { launchpadRouter } from './launchpad';
import { newsRouter } from './news';

export const appRouter = router({
  auth: authRouter,
  grants: grantsRouter,
  governance: governanceRouter,
  launchpad: launchpadRouter,
  news: newsRouter,
});

export type AppRouter = typeof appRouter;

