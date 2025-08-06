import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { BenefitsManagement } from '@/components/admin/benefits-management';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function BenefitsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  // Get company name
  let companyName = 'Your Company';
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId))
    .limit(1);
  
  if (company) {
    companyName = company.name;
  }
  
  return (
    <div className="p-8">
      <BenefitsManagement companyId={session.user.companyId} companyName={companyName} />
    </div>
  );
}