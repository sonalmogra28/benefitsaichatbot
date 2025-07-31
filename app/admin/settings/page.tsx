import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user || session.user.type !== 'platform_admin') {
    redirect('/login');
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure platform-wide settings</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>This feature is coming soon</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Platform configuration options will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}