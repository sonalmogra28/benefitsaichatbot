import { NextResponse, type NextRequest } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { settingsService } from '@/lib/services/settings.service';
import { z } from 'zod';

const settingsSchema = z.object({
  platform: z.object({
    name: z.string().min(1, 'Platform name is required'),
    url: z.string().url('Invalid URL format'),
    supportEmail: z.string().email('Invalid email format'),
    maxFileSize: z.number().min(1, 'Max file size must be at least 1MB'),
    allowedFileTypes: z.array(z.string()).min(1, 'At least one file type must be allowed'),
  }),
  security: z.object({
    mfaRequired: z.boolean(),
    sessionTimeout: z.number().min(5, 'Session timeout must be at least 5 minutes'),
    passwordMinLength: z.number().min(6, 'Password must be at least 6 characters'),
    passwordRequireSpecial: z.boolean(),
    maxLoginAttempts: z.number().min(1, 'Max login attempts must be at least 1'),
  }),
  notifications: z.object({
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    newUserNotification: z.boolean(),
    systemAlerts: z.boolean(),
    weeklyReports: z.boolean(),
  }),
  ai: z.object({
    provider: z.string().min(1, 'AI provider is required'),
    model: z.string().min(1, 'AI model is required'),
    temperature: z.number().min(0).max(1, 'Temperature must be between 0 and 1'),
    maxTokens: z.number().min(1, 'Max tokens must be at least 1'),
    streamingEnabled: z.boolean(),
  }),
  storage: z.object({
    provider: z.string().min(1, 'Storage provider is required'),
    maxStoragePerCompany: z.number().min(1, 'Max storage must be at least 1GB'),
    autoDeleteAfter: z.number().min(0, 'Auto-delete days must be 0 or greater'),
    compressionEnabled: z.boolean(),
  }),
});

// GET /api/admin/settings - Get platform settings
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    logger.info('API Request: GET /api/admin/settings', {
      userId: user.id
    });

    const settings = await settingsService.getSettings();
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = await settingsService.getDefaultSettings();
      return NextResponse.json({
        success: true,
        data: defaultSettings
      });
    }

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Settings retrieval error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve settings' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update platform settings
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const body = await request.json();
    const validatedSettings = settingsSchema.parse(body);

    logger.info('API Request: PUT /api/admin/settings', {
      userId: user.id,
      settingsKeys: Object.keys(validatedSettings)
    });

    const savedSettings = await settingsService.saveSettings(validatedSettings, user.id);

    return NextResponse.json({
      success: true,
      data: savedSettings,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid settings format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    logger.error('Settings update error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update settings' 
      },
      { status: 500 }
    );
  }
}
