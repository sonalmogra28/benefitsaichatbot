import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await auth();
  
  if (!session?.user || session.user.type !== 'platform_admin') {
    redirect('/login');
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground">Platform-wide usage analytics and insights</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>This feature is coming soon in Phase 2.4</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Comprehensive analytics and reporting will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}