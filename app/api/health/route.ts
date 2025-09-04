import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/services/logger.service';
import { getConfig } from '@/config/environments';
import { FieldValue } from 'firebase-admin/firestore';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  checks: HealthCheckResult[];
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const config = getConfig();

  // Basic health check - always returns 200 if service is running
  const basicHealth = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    environment: config.name,
    version: process.env.npm_package_version || '3.1.0',
    uptime: process.uptime(),
  };

  // Check for detailed health check request
  const isDetailed = req.nextUrl.searchParams.get('detailed') === 'true';

  if (!isDetailed) {
    return NextResponse.json(basicHealth);
  }

  // Detailed health checks
  const checks: HealthCheckResult[] = [];

  // Check Firebase Auth
  const authCheck = await checkFirebaseAuth();
  checks.push(authCheck);

  // Check Firestore
  const firestoreCheck = await checkFirestore();
  checks.push(firestoreCheck);

  // Redis check removed - using in-memory rate limiting

  // Check AI services
  const aiCheck = await checkAIServices();
  checks.push(aiCheck);

  // Determine overall health status
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (hasUnhealthy) overallStatus = 'unhealthy';
  else if (hasDegraded) overallStatus = 'degraded';

  const healthStatus: HealthStatus = {
    ...basicHealth,
    status: overallStatus,
    checks,
  };

  // Log health check
  logger.info('Health check performed', {
    metadata: {
      status: overallStatus,
      duration: Date.now() - startTime,
      checksPerformed: checks.length,
    },
  });

  // Return appropriate status code
  const statusCode =
    overallStatus === 'healthy'
      ? 200
      : overallStatus === 'degraded'
        ? 200
        : 503;

  return NextResponse.json(healthStatus, { status: statusCode });
}

async function checkFirebaseAuth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Try to verify a test token or list users with limit 1
    await adminAuth.listUsers(1);

    return {
      service: 'Firebase Auth',
      status: 'healthy',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    logger.error('Firebase Auth health check failed', error as Error);
    return {
      service: 'Firebase Auth',
      status: 'unhealthy',
      message: 'Failed to connect to Firebase Auth',
      responseTime: Date.now() - start,
    };
  }
}

async function checkFirestore(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Try to read from a system collection
    const doc = await adminDb.collection('system').doc('health').get();

    // Write a health check timestamp
    await adminDb.collection('system').doc('health').set(
      {
        lastCheck: FieldValue.serverTimestamp(),
        status: 'healthy',
      },
      { merge: true },
    );

    return {
      service: 'Firestore',
      status: 'healthy',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    logger.error('Firestore health check failed', error as Error);
    return {
      service: 'Firestore',
      status: 'unhealthy',
      message: 'Failed to connect to Firestore',
      responseTime: Date.now() - start,
    };
  }
}

async function checkAIServices(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const hasGoogleAI = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    if (!hasGoogleAI && !hasOpenAI && !hasAnthropic) {
      return {
        service: 'AI Services',
        status: 'unhealthy',
        message: 'No AI providers configured',
      };
    }

    // Could add actual API health checks here
    const providers = [];
    if (hasGoogleAI) providers.push('Google');
    if (hasOpenAI) providers.push('OpenAI');
    if (hasAnthropic) providers.push('Anthropic');

    return {
      service: 'AI Services',
      status: 'healthy',
      message: `Available: ${providers.join(', ')}`,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    logger.error('AI services health check failed', error as Error);
    return {
      service: 'AI Services',
      status: 'degraded',
      message: 'Error checking AI services',
      responseTime: Date.now() - start,
    };
  }
}
