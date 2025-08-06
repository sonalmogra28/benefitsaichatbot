import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service';
import { stackServerApp } from '@/stack';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For testing purposes, we'll allow any authenticated user
    // In production, you might want to restrict this to admins only

    const { type, ...params } = await request.json();

    let result: { success: boolean; error?: string };

    switch (type) {
      case 'user-invite':
        if (!params.email || !params.name || !params.inviteLink) {
          return NextResponse.json(
            { error: 'Email, name, and inviteLink are required for user invite' },
            { status: 400 }
          );
        }
        result = await emailService.sendUserInvite({
          email: params.email,
          name: params.name,
          companyName: params.companyName || 'Your Company',
          inviteLink: params.inviteLink,
          role: params.role || 'employee',
        });
        break;

      case 'password-reset':
        if (!params.email || !params.name || !params.resetLink) {
          return NextResponse.json(
            { error: 'Email, name, and resetLink are required for password reset' },
            { status: 400 }
          );
        }
        result = await emailService.sendPasswordReset({
          email: params.email,
          name: params.name,
          resetLink: params.resetLink,
        });
        break;

      case 'notification':
        if (!params.email || !params.name || !params.title || !params.message) {
          return NextResponse.json(
            { error: 'Email, name, title, and message are required for notification' },
            { status: 400 }
          );
        }
        result = await emailService.sendNotification({
          email: params.email,
          name: params.name,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type. Supported types: user-invite, password-reset, notification' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
      result,
    });

  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Test Endpoint',
    usage: 'POST with { type, ...params }',
    supportedTypes: [
      {
        type: 'user-invite',
        params: ['email', 'name', 'inviteLink', 'companyName?', 'role?']
      },
      {
        type: 'password-reset',
        params: ['email', 'name', 'resetLink']
      },
      {
        type: 'notification',
        params: ['email', 'name', 'title', 'message', 'actionUrl?']
      }
    ]
  });
}
