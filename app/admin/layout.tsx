'use client';

import Link from 'next/link';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!account) {
    router.push('/login');
    return null;
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
            <Link
              href="/admin"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/documents"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              📄 Documents
            </Link>
            <Link
              href="/admin/companies"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Companies
            </Link>
            <Link
              href="/admin/users"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Users
            </Link>
            <Link
              href="/admin/analytics"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Analytics
            </Link>
            <Link
              href="/admin/settings"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Settings
            </Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
