import { t } from '@/lib/trpc';
import { adminAuth } from '@/lib/firebase/admin-sdk';
import { TRPCError } from '@trpc/server';

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
