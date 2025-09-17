/**
 * Health check endpoint for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { logger } from '@/lib/logging/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    api: 'up' | 'down';
    memory: 'ok' | 'warning' | 'critical';
  };
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    let databaseStatus: 'up' | 'down' = 'down';
    try {
      const container = await getContainer('_health');
      await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
      databaseStatus = 'up';
    } catch (error) {
      logger.error('Database health check failed', { error });
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    let memoryStatus: 'ok' | 'warning' | 'critical' = 'ok';
    
    if (memoryUsageMB > 1000) {
      memoryStatus = 'critical';
    } else if (memoryUsageMB > 500) {
      memoryStatus = 'warning';
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (databaseStatus === 'down') {
      overallStatus = 'unhealthy';
    } else if (memoryStatus === 'critical') {
      overallStatus = 'unhealthy';
    } else if (memoryStatus === 'warning') {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: databaseStatus,
        api: 'up',
        memory: memoryStatus,
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage,
        responseTime,
      },
    };

    // Log health check
    logger.info('Health check performed', {
      status: overallStatus,
      responseTime,
      memoryUsageMB: Math.round(memoryUsageMB),
    });

    return NextResponse.json(healthStatus, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    logger.error('Health check error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}