'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firestore';

export default function CompanyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const [companyDoc, companyLoading, companyError] = useDocument(
    user ? doc(db, 'companies', user.uid) : null,
  );

  if (loading || companyLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <aside className="w-64 border-r bg-background">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {companyDoc?.data()?.name}
            </h2>
            <p className="text-sm text-muted-foreground">Admin Portal</p>
          </div>
          <nav className="p-4 space-y-2">
            <a
              href="/company-admin"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Dashboard
            </a>
            <a
              href="/company-admin/employees"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Employees
            </a>
            <a
              href="/company-admin/benefits"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Benefit Plans
            </a>
            <a
              href="/company-admin/enrollments"
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              Enrollments
            </a>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
