import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, data.stackUserId))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    let companyId: string;

    if (data.userType === 'platform_admin') {
      // Platform admins don't belong to a specific company
      // Create a special platform company if it doesn't exist
      const platformCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.stackOrgId, 'platform'))
        .limit(1);

      if (platformCompany.length === 0) {
        const [newCompany] = await db
          .insert(companies)
          .values({
            stackOrgId: 'platform',
            name: 'Platform Administration',
            domain: 'platform',
            subscriptionTier: 'platform',
            settings: {
              isPlatformCompany: true
            }
          })
          .returning();
        companyId = newCompany.id;
      } else {
        companyId = platformCompany[0].id;
      }
    } else {
      // For other users, check if company exists or create it
      if (!data.companyName || !data.companyDomain) {
        return NextResponse.json({ error: 'Company information required' }, { status: 400 });
      }

      const existingCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.domain, data.companyDomain))
        .limit(1);

      if (existingCompany.length > 0) {
        companyId = existingCompany[0].id;
      } else {
        // Create new company
        const [newCompany] = await db
          .insert(companies)
          .values({
            stackOrgId: `org_${data.companyDomain}`, // This would normally come from Stack Auth
            name: data.companyName,
            domain: data.companyDomain,
            subscriptionTier: 'trial',
            settings: {
              branding: {
                primaryColor: '#0066CC',
                logo: null
              },
              features: {
                documentAnalysis: true,
                aiRecommendations: true,
                analytics: true
              }
            }
          })
          .returning();
        companyId = newCompany.id;
      }
    }

    // Map user types to roles
    const roleMap: Record<string, string> = {
      platform_admin: 'platform_admin',
      company_admin: 'company_admin',
      hr_admin: 'hr_admin',
      employee: 'employee'
    };

    // Create user
    await db.insert(users).values({
      stackUserId: data.stackUserId,
      companyId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: roleMap[data.userType],
      department: data.department,
      isActive: true
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}