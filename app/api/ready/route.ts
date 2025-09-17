import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { logger } from '@/lib/services/logger.service';

/**
 * GET /api/ready
 * Readiness probe for container orchestration (Kubernetes, Cloud Run, etc.)
 * Returns 200 when the application is ready to serve traffic
 * Returns 503 when the application is not ready
 */
export async function GET(req: NextRequest) {
  const checks = {
    cosmos: false,
    azureAuth: false,
    environment: false,
  };

  try {
    // Check Azure Cosmos DB is accessible
    try {
      const container = await getContainer('system');
      await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
      checks.cosmos = true;
    } catch (error) {
      logger.warn('Cosmos DB not ready', {
        metadata: { error: (error as Error).message },
      });
    }

    // Check Azure AD B2C configuration
    try {
      checks.azureAuth = !!(
        process.env.AZURE_AD_CLIENT_ID &&
        process.env.AZURE_AD_TENANT_ID
      );
    } catch (error) {
      logger.warn('Azure AD B2C not ready', {
        metadata: { error: (error as Error).message },
      });
    }

    // Check required environment variables
    checks.environment = !!(
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.COSMOS_DB_ENDPOINT &&
      (process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY)
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
