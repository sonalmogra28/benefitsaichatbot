import { type NextRequest, NextResponse } from 'next/server';
import { userSyncService } from '@/lib/services/user-sync.service';
import crypto from 'node:crypto';

// Stack Auth webhook event types
interface StackWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'organization.created' | 'organization.updated';
  userId?: string;
  organizationId?: string;
  data: any;
  timestamp: string;
}

/**
 * Verify Stack Auth webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle Stack Auth webhooks for user synchronization
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.STACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STACK_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get signature from headers
    const signature = request.headers.get('x-stack-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event: StackWebhookEvent = JSON.parse(rawBody);

    console.log(`Received Stack webhook: ${event.type}`, {
      userId: event.userId,
      organizationId: event.organizationId,
    });

    // Handle different event types
    switch (event.type) {
      case 'user.created':
        if (event.userId) {
          // Sync new user from webhook data
          await userSyncService.syncUserFromWebhook(event.userId, event.data);
          
          // Check if user needs to be added to an organization
          if (event.data.organizationId) {
            await handleUserOrganizationAssignment(
              event.userId,
              event.data.organizationId
            );
          }
        }
        break;

      case 'user.updated':
        if (event.userId) {
          // Handle user updates
          await userSyncService.handleUserUpdate(event.userId, event.data);
        }
        break;

      case 'user.deleted':
        if (event.userId) {
          // Handle user deletion (soft delete in our database)
          await handleUserDeletion(event.userId);
        }
        break;

      case 'organization.created':
      case 'organization.updated':
        if (event.organizationId) {
          // Handle organization events
          await handleOrganizationEvent(event);
        }
        break;

      default:
        console.warn(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Stack webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle user assignment to organization
 */
async function handleUserOrganizationAssignment(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    // Get organization details from our database
    const { db } = await import('@/lib/db');
    const { companies, users } = await import('@/lib/db/schema');
    const { eq, sql } = await import('drizzle-orm');

    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.stackOrgId, organizationId))
      .limit(1);

    if (company && company.length > 0) {
      // Update user's company assignment in database
      await db.execute(sql`
        UPDATE users 
        SET 
          company_id = ${company[0].id},
          updated_at = CURRENT_TIMESTAMP
        WHERE stack_user_id = ${userId}
      `);
    }
  } catch (error) {
    console.error('Failed to handle user organization assignment:', error);
  }
}

/**
 * Handle user deletion
 */
async function handleUserDeletion(stackUserId: string): Promise<void> {
  try {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');

    // Soft delete user
    await db.execute(sql`
      UPDATE users 
      SET 
        status = 'inactive',
        updated_at = CURRENT_TIMESTAMP
      WHERE stack_user_id = ${stackUserId}
    `);

    console.log(`Soft deleted user ${stackUserId}`);
  } catch (error) {
    console.error(`Failed to handle user deletion for ${stackUserId}:`, error);
  }
}

/**
 * Handle organization events
 */
async function handleOrganizationEvent(event: StackWebhookEvent): Promise<void> {
  try {
    const { db } = await import('@/lib/db');
    const { companies } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    switch (event.type) {
      case 'organization.created':
        // Check if we need to create a company record
        console.log('Stack organization created:', event.organizationId);
        break;

      case 'organization.updated':
        // Update company details if needed
        if (event.organizationId && event.data.name) {
          await db
            .update(companies)
            .set({
              name: event.data.name,
              updatedAt: new Date(),
            })
            .where(eq(companies.stackOrgId, event.organizationId));
        }
        break;
    }
  } catch (error) {
    console.error('Failed to handle organization event:', error);
  }
}

// Also support GET for webhook verification
export async function GET(request: NextRequest) {
  // Stack Auth may send a GET request to verify the webhook endpoint
  return NextResponse.json({ status: 'ok' });
}