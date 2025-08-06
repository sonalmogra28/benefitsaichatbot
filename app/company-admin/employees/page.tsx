import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { EmployeeList } from '@/components/admin/employee-list';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const companyName = session.user.company?.name || 'Your Company';
  
  return (
    <div className="p-8">
      <EmployeeList companyId={session.user.companyId} companyName={companyName} />
    </div>
  );
}