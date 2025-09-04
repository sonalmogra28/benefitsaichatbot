// app/(chat)/profile/page.tsx
import { MfaEnrollment } from '@/components/mfa-enrollment';
import { SignOutForm } from '@/components/sign-out-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Manage Your Profile</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Factor Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <MfaEnrollment />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sign Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Are you sure you want to sign out of your account?
            </p>
            <SignOutForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
