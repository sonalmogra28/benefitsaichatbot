import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  // Check if user has platform admin role
  if (session.user.type !== 'platform_admin') {
    redirect('/');
  }
  
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <aside className="w-64 border-r bg-background">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Platform Admin</h2>
            <p className="text-sm text-muted-foreground">System Management</p>
          </div>
          <nav className="p-4 space-y-2">
            <a href="/admin" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Dashboard
            </a>
            <a href="/admin/companies" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Companies
            </a>
            <a href="/admin/users" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Users
            </a>
            <a href="/admin/analytics" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Analytics
            </a>
            <a href="/admin/settings" className="block px-4 py-2 rounded-lg hover:bg-muted">
              Settings
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