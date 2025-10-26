import { router } from '../trpc';
import { authRouter } from './auth';
import { grantsRouter } from './grants';
import { governanceRouter } from './governance';
import { launchpadRouter } from './launchpad';

export const appRouter = router({
  auth: authRouter,
  grants: grantsRouter,
  governance: governanceRouter,
  launchpad: launchpadRouter,
});

export type AppRouter = typeof appRouter;

