import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { getCompanyById } from '@/lib/db/tenant-context';
import { SidebarProvider } from '@/components/ui/sidebar';

export default async function CompanyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  // Check if user has admin role
  if (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin') {
    redirect('/');
  }
  
  if (!session.user.companyId) {
    redirect('/');
  }
  
  const company = await getCompanyById(session.user.companyId);
  
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <aside className="w-64 border-r bg-background">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">{company.name}</h2>
            <p className="text-sm text-muted-foreground">Admin Portal</p>
          </div>
          <nav className="p-4 space-y-2">
            <a href="/company-admin" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Dashboard
            </a>
            <a href="/company-admin/employees" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Employees
            </a>
            <a href="/company-admin/benefits" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Benefit Plans
            </a>
            <a href="/company-admin/enrollments" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Enrollments
            </a>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}