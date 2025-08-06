import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { BenefitsManagement } from '@/components/admin/benefits-management';

export const dynamic = 'force-dynamic';

export default async function BenefitsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const companyName = session.user.company?.name || 'Your Company';
  
  return (
    <div className="p-8">
      <BenefitsManagement companyId={session.user.companyId} companyName={companyName} />
    </div>
  );
}