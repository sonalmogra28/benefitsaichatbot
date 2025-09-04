import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/services/logger.service';

/**
 * GET /api/ready
 * Readiness probe for container orchestration (Kubernetes, Cloud Run, etc.)
 * Returns 200 when the application is ready to serve traffic
 * Returns 503 when the application is not ready
 */
export async function GET(req: NextRequest) {
  const checks = {
    firebase: false,
    firestore: false,
    environment: false,
  };

  try {
    // Check Firebase Auth is initialized
    try {
      await adminAuth.listUsers(1);
      checks.firebase = true;
    } catch (error) {
      logger.warn('Firebase Auth not ready', {
        metadata: { error: (error as Error).message },
      });
    }

    // Check Firestore is accessible
    try {
      await adminDb.collection('system').doc('ready').get();
      checks.firestore = true;
    } catch (error) {
      logger.warn('Firestore not ready', {
        metadata: { error: (error as Error).message },
      });
    }

    // Check required environment variables
    checks.environment = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      (process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY)
    );

    // All checks must pass for readiness
    const isReady = Object.values(checks).every((check) => check === true);

    if (isReady) {
      return NextResponse.json({
        ready: true,
        checks,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn('Application not ready', { metadata: { checks } });
      return NextResponse.json(
        {
          ready: false,
          checks,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    return NextResponse.json(
      {
        ready: false,
        error: 'Internal error during readiness check',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

/**
 * GET /api/live
 * Liveness probe - simple check that the process is running
 * Should restart the container if this fails
 */
export async function HEAD(req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
