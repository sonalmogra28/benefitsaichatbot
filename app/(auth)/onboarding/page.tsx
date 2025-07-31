'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function OnboardingForm() {
  const user = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<string>('employee');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyDomain, setCompanyDomain] = useState<string>('');
  const [department, setDepartment] = useState<string>('');

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackUserId: user?.id,
          email: user?.primaryEmail,
          userType,
          firstName,
          lastName,
          companyName: userType !== 'platform_admin' ? companyName : undefined,
          companyDomain: userType !== 'platform_admin' ? companyDomain : undefined,
          department: userType === 'employee' ? department : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      // Redirect based on role
      if (userType === 'platform_admin') {
        router.push('/admin');
      } else if (userType === 'company_admin' || userType === 'hr_admin') {
        router.push('/company-admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Benefits AI!</CardTitle>
          <CardDescription>
            Let&apos;s get your account set up. Please tell us a bit about yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="text-sm text-muted-foreground">{user.primaryEmail}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userType">Your Role</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr_admin">HR Administrator</SelectItem>
                <SelectItem value="company_admin">Company Administrator</SelectItem>
                <SelectItem value="platform_admin">Platform Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userType !== 'platform_admin' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyDomain">Company Domain</Label>
                <Input
                  id="companyDomain"
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                  placeholder="acme"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used as your company&apos;s unique identifier
                </p>
              </div>
            </>
          )}

          {userType === 'employee' && (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering, Sales, etc."
              />
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handleComplete}
            disabled={isLoading || !firstName || !lastName || 
              (userType !== 'platform_admin' && (!companyName || !companyDomain))}
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="h-96 w-96 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  );
}