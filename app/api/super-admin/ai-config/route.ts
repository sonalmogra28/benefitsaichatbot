import { NextResponse, type NextRequest } from 'next/server';
import { protectSuperAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { aiConfigService } from '@/lib/services/ai-config.service';
import { z } from 'zod';

const aiConfigSchema = z.object({
  personality: z.string().min(10, 'Personality must be at least 10 characters'),
  tone: z.enum(['formal', 'friendly', 'neutral', 'humorous']),
  responseLength: z.number().min(50).max(500),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(1).max(4096).optional(),
  systemPrompt: z.string().optional(),
  enabledFeatures: z.array(z.string()).optional(),
});

// GET /api/super-admin/ai-config - Get AI configuration
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectSuperAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    logger.info('API Request: GET /api/super-admin/ai-config', {
      userId: user.id
    });

    const config = await aiConfigService.getAIConfig();
    
    if (!config) {
      // Return default config if none exists
      const defaultConfig = await aiConfigService.getDefaultAIConfig();
      return NextResponse.json({
        success: true,
        data: defaultConfig
      });
    }

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('AI config retrieval error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve AI configuration' 
      },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/ai-config - Update AI configuration
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectSuperAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const body = await request.json();
    const validatedConfig = aiConfigSchema.parse(body);

    logger.info('API Request: POST /api/super-admin/ai-config', {
      userId: user.id,
      configKeys: Object.keys(validatedConfig)
    });

    // Validate the configuration
    const validation = await aiConfigService.validateConfig(validatedConfig);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid configuration',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const savedConfig = await aiConfigService.saveAIConfig(validatedConfig, user.id);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/super-admin/ai-config', 200, duration, {
      userId: user.id,
      configId: savedConfig.id
    });

    return NextResponse.json({
      success: true,
      data: savedConfig,
      message: 'AI configuration saved successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid configuration format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    logger.error('AI config update error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update AI configuration' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/ai-config/reset - Reset AI configuration to defaults
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectSuperAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    logger.info('API Request: PUT /api/super-admin/ai-config/reset', {
      userId: user.id
    });

    const resetConfig = await aiConfigService.resetToDefaults(user.id);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('PUT', '/api/super-admin/ai-config/reset', 200, duration, {
      userId: user.id,
      configId: resetConfig.id
    });

    return NextResponse.json({
      success: true,
      data: resetConfig,
      message: 'AI configuration reset to defaults'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('AI config reset error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset AI configuration' 
      },
      { status: 500 }
    );
  }
}