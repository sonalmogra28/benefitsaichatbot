import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service.server';
import { adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  oobCode: z.string(),
  newPassword: z.string().min(8),
});

// POST /api/auth/password-reset - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestResetSchema.parse(body);

    const link = await adminAuth.generatePasswordResetLink(email);

    await emailService.sendPasswordReset({
      email,
      name: 'User',
      resetLink: link,
    });

    return NextResponse.json({
      message:
        'If an account with that email exists, you will receive a password reset link.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/auth/password-reset - Confirm password reset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oobCode, newPassword } = confirmResetSchema.parse(body);

    // Note: Password reset confirmation should be done on the client side
    // using Firebase Auth SDK's confirmPasswordReset method
    // This endpoint is kept for backward compatibility but returns guidance
    
    return NextResponse.json({
      message: 'Please use client-side Firebase Auth to confirm password reset',
      clientMethod: 'confirmPasswordReset(auth, oobCode, newPassword)',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
