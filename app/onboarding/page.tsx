'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@stackframe/stack';

export default function OnboardingPage() {
  const router = useRouter();
  const user = useUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    userType: '',
    companyName: '',
    companyDomain: '',
    firstName: '',
    lastName: '',
    department: ''
  });

  const handleUserTypeSelect = (type: string) => {
    setFormData({ ...formData, userType: type });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create user in database with selected role
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackUserId: user?.id,
          email: user?.primaryEmail,
          ...formData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Redirect based on user type
      if (formData.userType === 'platform_admin') {
        router.push('/admin');
      } else if (formData.userType === 'company_admin' || formData.userType === 'hr_admin') {
        router.push('/company-admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to Benefits AI Platform</CardTitle>
          <CardDescription>
            Let&apos;s get you set up with the right access level
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">I am a...</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleUserTypeSelect('platform_admin')}
                >
                  <CardContent className="p-6">
                    <h4 className="font-medium">Platform Administrator</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      I manage the entire Benefits AI platform and oversee multiple companies
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleUserTypeSelect('company_admin')}
                >
                  <CardContent className="p-6">
                    <h4 className="font-medium">Company Administrator</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      I manage benefits for my company
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleUserTypeSelect('hr_admin')}
                >
                  <CardContent className="p-6">
                    <h4 className="font-medium">HR Administrator</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      I help employees with benefits questions
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleUserTypeSelect('employee')}
                >
                  <CardContent className="p-6">
                    <h4 className="font-medium">Employee</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      I want to learn about my benefits
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formData.userType === 'platform_admin' ? (
                <div className="space-y-2">
                  <Label>Platform Access</Label>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll have access to the platform administration dashboard
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Enter your company name"
                      required
                    />
                  </div>

                  {(formData.userType === 'company_admin' || formData.userType === 'hr_admin') && (
                    <div className="space-y-2">
                      <Label htmlFor="companyDomain">Company Domain</Label>
                      <Input
                        id="companyDomain"
                        value={formData.companyDomain}
                        onChange={(e) => setFormData({ ...formData, companyDomain: e.target.value })}
                        placeholder="yourcompany (for yourcompany.benefitsai.com)"
                        pattern="[a-z0-9-]+"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be your company&apos;s unique URL
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Human Resources, Engineering"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit">
                  Complete Setup
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}