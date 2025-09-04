// app/api/super-admin/users/route.ts
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getSessionFromHeader, hasRole } from '@/lib/auth/session';
import { z } from 'zod';
import { userService } from '@/lib/firebase/services/user.service';

// Input validation schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum([
    'employee',
    'hr-admin',
    'company-admin',
    'platform-admin',
    'super-admin',
  ]),
  companyId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export async function POST(request: Request) {
  try {
    // Verify authentication and super-admin role
    const currentUser = await getSessionFromHeader(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!hasRole(currentUser, 'super-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Super-admin role required.' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, password, role, companyId, firstName, lastName } =
      validationResult.data;

    // Check if user already exists
    const existingUser = await adminAuth
      .getUserByEmail(email)
      .catch(() => null);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 },
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
    });

    // Set custom claims for role-based access
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      companyId: companyId || null,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
    });

    // Create user document in Firestore
    await adminDb
      .collection('users')
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        role,
        companyId: companyId || null,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        status: 'active',
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        emailVerified: false,
        profileComplete: false,
      });

    // Log the user creation for audit
    await adminDb.collection('audit_logs').add({
      action: 'user_created',
      targetUserId: userRecord.uid,
      targetEmail: email,
      targetRole: role,
      performedBy: currentUser.uid,
      performedByEmail: currentUser.email,
      performedByRole: currentUser.role,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Send verification email
    const verificationLink =
      await adminAuth.generateEmailVerificationLink(email);

    // TODO: Send email via email service
    // For now, log the verification link
    await adminDb.collection('pending_emails').add({
      to: email,
      template: 'user_welcome',
      data: {
        firstName,
        verificationLink,
        role,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        message: 'User created successfully. Verification email queued.',
      },
      { status: 201 },
    );
  } catch (error) {
    // Log error securely
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await adminDb.collection('error_logs').add({
      endpoint: '/api/super-admin/users',
      method: 'POST',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to create user. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getSessionFromHeader(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!hasRole(currentUser, 'super-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Super-admin role required.' },
        { status: 403 },
      );
    }

    const users = await userService.listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}
