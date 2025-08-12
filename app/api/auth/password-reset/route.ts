import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  newPassword: z.string().min(8),
});

// POST /api/auth/password-reset - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestResetSchema.parse(body);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message:
          'If an account with that email exists, you will receive a password reset link.',
      });
    }

    // Generate reset token (in production, this should be stored in database with expiration)
    const resetToken = nanoid(32);
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email
    const result = await emailService.sendPasswordReset({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      resetLink,
    });

    if (!result.success) {
      console.error('Failed to send password reset email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 },
      );
    }

    // TODO: Store reset token in database with expiration

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
    const { token, email, newPassword } = confirmResetSchema.parse(body);

    // TODO: Verify token from database and check expiration
    // For now, just verify user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 },
      );
    }

    // TODO: Hash password and update user
    // This would typically involve updating the user's password in the auth system

    return NextResponse.json({
      message:
        'Password reset successfully. You can now log in with your new password.',
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
