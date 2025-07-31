import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function NewCompanyPage() {
  const session = await auth();
  
  if (!session?.user || session.user.type !== 'platform_admin') {
    redirect('/login');
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Company</h1>
        <p className="text-muted-foreground">Set up a new company on the platform</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Company Setup Wizard</CardTitle>
          <CardDescription>This feature is coming soon in Phase 2.3</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>The company creation wizard will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}