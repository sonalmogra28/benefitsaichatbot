// app/api/super-admin/service/route.ts
import { NextResponse } from 'next/server';
import { superAdminService } from '@/lib/services/super-admin.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'getPlatformStats':
        const stats = await superAdminService.getPlatformStats();
        return NextResponse.json(stats);
      case 'getRecentActivity':
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const activity = await superAdminService.getRecentActivity(limit);
        return NextResponse.json(activity);
      case 'getSystemSettings':
        const settings = await superAdminService.getSystemSettings();
        return NextResponse.json(settings);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in Super Admin service API (action: ${action}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'updateSystemSettings':
        const body = await request.json();
        await superAdminService.updateSystemSettings(body);
        return NextResponse.json({ message: 'Settings updated successfully' });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in Super Admin service API (action: ${action}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
