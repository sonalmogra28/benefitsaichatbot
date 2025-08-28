import { t } from './index';
import { adminRouter } from './routers/admin';

export const appRouter = t.router({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
