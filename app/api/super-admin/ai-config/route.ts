
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { superAdminService } from '@/lib/services/super-admin.service';
import * as z from 'zod';

// Define the validation schema for the AI settings
const aiConfigSchema = z.object({
  personality: z.string().min(10),
  tone: z.enum(['formal', 'friendly', 'neutral', 'humorous']),
  responseLength: z.number().min(50).max(500),
});

/**
 * GET handler to retrieve the current AI configuration.
 * @param request The incoming Next.js request.
 * @returns A JSON response with the AI settings or an error.
 */
export async function GET(request: Request) {
  try {
    // TODO: Add proper authentication and authorization checks for super admin
    const settings = await superAdminService.getSystemSettings();
    return NextResponse.json(settings.aiSettings);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST handler to update the AI configuration.
 * @param request The incoming Next.js request.
 * @returns A JSON response confirming the update or an error.
 */
export async function POST(request: Request) {
  try {
    // TODO: Add proper authentication and authorization checks for super admin
    const json = await request.json();
    const validatedData = aiConfigSchema.parse(json);

    const currentSettings = await superAdminService.getSystemSettings();
    
    const updatedAiSettings = {
      ...currentSettings.aiSettings, // Preserve existing AI settings
      ...validatedData, // Overwrite with new, validated data
    };

    await superAdminService.updateSystemSettings({ aiSettings: updatedAiSettings });

    return NextResponse.json({ message: 'AI configuration updated successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    console.error('Error updating AI settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
