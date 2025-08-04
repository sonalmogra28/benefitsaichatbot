import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';

const onboardingSchema = z.object({
  stackUserId: z.string(),
  email: z.string().email(),
  userType: z.enum(['platform_admin', 'company_admin', 'hr_admin', 'employee']),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  department: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = onboardingSchema.parse(body);

    // Start a transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      // Check if user already exists by Stack User ID or email combination
      const existingUsers = await tx
        .select()
        .from(users)
        .where(
          or(
            eq(users.stackUserId, data.stackUserId),
            eq(users.email, data.email)
          )
        );

      // If user exists with same Stack ID, return success (idempotent)
      const userByStackId = existingUsers.find(u => u.stackUserId === data.stackUserId);
      if (userByStackId) {
        return NextResponse.json({ 
          success: true, 
          message: 'User already onboarded',
          user: userByStackId 
        });
      }

      // Determine target company ID
      let targetCompanyId: string;
      
      if (data.userType === 'platform_admin') {
        // Find or create platform company
        const platformCompany = await tx
          .select()
          .from(companies)
          .where(eq(companies.stackOrgId, 'platform'))
          .limit(1);

        if (platformCompany.length === 0) {
          const [newCompany] = await tx
            .insert(companies)
            .values({
              stackOrgId: 'platform',
              name: 'Platform Administration',
              domain: 'platform',
              subscriptionTier: 'platform',
              settings: { isPlatformCompany: true }
            })
            .returning();
          targetCompanyId = newCompany.id;
        } else {
          targetCompanyId = platformCompany[0].id;
        }
      } else {
        // For other users, validate company info and find/create company
        if (!data.companyName || !data.companyDomain) {
          return NextResponse.json({ error: 'Company information required' }, { status: 400 });
        }

        const existingCompany = await tx
          .select()
          .from(companies)
          .where(eq(companies.domain, data.companyDomain))
          .limit(1);

        if (existingCompany.length > 0) {
          targetCompanyId = existingCompany[0].id;
        } else {
          // Create new company
          const [newCompany] = await tx
            .insert(companies)
            .values({
              stackOrgId: `org_${data.companyDomain}`,
              name: data.companyName,
              domain: data.companyDomain,
              subscriptionTier: 'trial',
              settings: {
                branding: { primaryColor: '#0066CC', logo: null },
                features: { documentAnalysis: true, aiRecommendations: true, analytics: true }
              }
            })
            .returning();
          targetCompanyId = newCompany.id;
        }
      }

      // Check for email conflicts in the target company
      const emailConflict = existingUsers.find(u => 
        u.email === data.email && u.companyId === targetCompanyId
      );
      
      if (emailConflict) {
        return NextResponse.json({ 
          error: `A user with email ${data.email} already exists in this company. If this is you, please sign in instead of creating a new account.`,
          details: 'EMAIL_ALREADY_EXISTS'
        }, { status: 409 });
      }

      // Map user types to roles
      const roleMap: Record<string, string> = {
        platform_admin: 'platform_admin',
        company_admin: 'company_admin',
        hr_admin: 'hr_admin',
        employee: 'employee'
      };

      // Create user
      const [newUser] = await tx.insert(users).values({
        stackUserId: data.stackUserId,
        companyId: targetCompanyId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: roleMap[data.userType],
        department: data.department,
        isActive: true
      }).returning();

      return NextResponse.json({ 
        success: true, 
        message: 'User onboarded successfully',
        user: newUser 
      });
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to complete onboarding',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
