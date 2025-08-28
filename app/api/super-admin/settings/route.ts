import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';

const settingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  signupsEnabled: z.boolean().optional(),
  defaultBillingPlan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  maxCompaniesPerDomain: z.number().min(1).max(100).optional(),
  emailSettings: z.object({
    provider: z.enum(['sendgrid', 'ses', 'smtp']),
    fromEmail: z.string().email(),
    fromName: z.string(),
  }).optional(),
  storageSettings: z.object({
    provider: z.enum(['s3', 'gcs', 'azure']),
    maxFileSizeMB: z.number().min(1).max(1000),
    allowedFileTypes: z.array(z.string()),
  }).optional(),
  aiSettings: z.object({
    provider: z.enum(['openai', 'anthropic']),
    model: z.string(),
    maxTokensPerRequest: z.number(),
    rateLimitPerMinute: z.number(),
  }).optional(),
  featureFlags: z.record(z.boolean()).optional(),
});

const superAdminService = new SuperAdminService();

// GET /api/super-admin/settings - Get system settings
export const GET = requireSuperAdmin(async (request: NextRequest) => {
  try {
    const settings = await superAdminService.getSystemSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
});

// PATCH /api/super-admin/settings - Update system settings
export const PATCH = requireSuperAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = settingsSchema.parse(body);
    
    await superAdminService.updateSystemSettings(validated);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
});