// app/(chat)/profile/page.tsx
import { MfaEnrollment } from '@/components/mfa-enrollment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Manage Your Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Multi-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <MfaEnrollment />
        </CardContent>
      </Card>
    </div>
  );
}
