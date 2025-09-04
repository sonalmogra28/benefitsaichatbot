'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Upload,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

export default function CompanyAdminDashboard() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [companyStats, setCompanyStats] = useState({
    totalEmployees: 0,
    activePlans: 0,
    totalDocuments: 0,
    monthlySpend: 0,
    enrollmentRate: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (
          !idTokenResult.claims.company_admin &&
          !idTokenResult.claims.hr_admin
        ) {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Company Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s benefits
          </p>
        </div>
        <div className="space-x-2">
          <Link href="/company-admin/employees/new">
            <Button variant="outline">
              <UserPlus className="mr-2 size-4" />
              Add Employee
            </Button>
          </Link>
          <Link href="/company-admin/documents/upload">
            <Button>
              <Upload className="mr-2 size-4" />
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyStats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.activePlans}</div>
            <p className="text-xs text-muted-foreground">Benefit plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${companyStats.monthlySpend.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyStats.totalDocuments}
            </div>
            <p className="text-xs text-muted-foreground">Uploaded files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Enrollment Rate
            </CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyStats.enrollmentRate}%
            </div>
            <p className="text-xs text-muted-foreground">Participation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Management Tools</CardTitle>
            <CardDescription>Core administrative functions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/company-admin/employees" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 size-4" />
                Employee Management
              </Button>
            </Link>
            <Link href="/company-admin/benefits" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 size-4" />
                Benefits Plans
              </Button>
            </Link>
            <Link href="/company-admin/documents" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 size-4" />
                Document Library
              </Button>
            </Link>
            <Link href="/company-admin/benefits/compare" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 size-4" />
                Plan Comparison
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">New enrollment</div>
              <div className="text-muted-foreground">
                John Doe enrolled in Health Plus plan
              </div>
              <div className="text-xs text-muted-foreground">2 hours ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Document uploaded</div>
              <div className="text-muted-foreground">
                2025 Benefits Guide added
              </div>
              <div className="text-xs text-muted-foreground">5 hours ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Plan updated</div>
              <div className="text-muted-foreground">
                Dental coverage limits increased
              </div>
              <div className="text-xs text-muted-foreground">1 day ago</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">
                Average cost per employee
              </div>
              <div className="text-2xl font-bold">$485/mo</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Most popular plan
              </div>
              <div className="text-2xl font-bold">Health Plus PPO</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                AI chat interactions
              </div>
              <div className="text-2xl font-bold">342 this month</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
