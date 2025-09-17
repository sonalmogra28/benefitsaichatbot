'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsDashboard() {
  const [users, usersLoading] = useCollection(collection(db, 'users'));
  const [companies, companiesLoading] = useCollection(
    collection(db, 'companies'),
  );
  const [documents, documentsLoading] = useCollection(
    collection(db, 'documents'),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? 'Loading...' : users?.docs.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {companiesLoading ? 'Loading...' : companies?.docs.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documentsLoading ? 'Loading...' : documents?.docs.length}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
