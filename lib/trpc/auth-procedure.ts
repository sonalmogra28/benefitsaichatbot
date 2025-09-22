import { t } from '@/lib/trpc';
import { validateToken } from '@/lib/azure/token-validation';
import { TRPCError } from '@trpc/server';
import { adminAuth } from '@/lib/auth/admin-auth';

export const authProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { req } = ctx;
  const sessionCookie = (req as any).cookies?.session;

  if (!sessionCookie) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    return next({
      ctx: {
        ...ctx,
        user: decodedClaims,
      },
    });
  } catch (error) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
});
