'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, FileText, BarChart3, Settings, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalDocuments: 0,
    activeChats: 0
  });

  useEffect(() => {
    // Check for demo mode
    const authMode = sessionStorage.getItem('authMode');
    const mockUser = sessionStorage.getItem('mockUser');
    
    if (authMode === 'demo' && mockUser) {
      setIsDemoMode(true);
      // Set some demo stats
      setStats({
        totalCompanies: 5,
        totalUsers: 127,
        totalDocuments: 43,
        activeChats: 89
      });
    } else if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (!idTokenResult.claims.super_admin) {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  if (loading && !isDemoMode) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage the entire benefits platform</p>
        </div>
        <Link href="/super-admin/companies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Benefits documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChats}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/super-admin/companies" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Companies
              </Button>
            </Link>
            <Link href="/super-admin/users" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/super-admin/documents" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Document Library
              </Button>
            </Link>
            <Link href="/super-admin/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Platform Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Firebase Status</span>
              <span className="text-sm font-medium text-green-600">Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">AI Service</span>
              <span className="text-sm font-medium text-green-600">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Storage</span>
              <span className="text-sm font-medium">12.4 GB / 100 GB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">API Calls Today</span>
              <span className="text-sm font-medium">2,451</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}