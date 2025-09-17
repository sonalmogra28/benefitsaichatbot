'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Search,
  Plus,
  Users,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Company {
  id: string;
  name: string;
  domain: string;
  employeeCount: number;
  planType: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: Date;
  adminEmail: string;
}

export default function AdminCompaniesPage() {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !account) {
      router.push('/login');
    } else if (account) {
      // Check if user has admin role
      if (
        account.role !== 'platform_admin' &&
        account.role !== 'super_admin'
      ) {
        router.push('/');
      }
    }
  }, [account, loading, router]);

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.domain.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
      default:
        return null;
    }
  };

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
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground">
            Manage platform companies and organizations
          </p>
        </div>
        <Link href="/admin/companies/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Add Company
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Companies
            </CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter((c) => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((acc, c) => acc + c.employeeCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter((c) => c.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Need configuration</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No companies found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Add your first company to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Company Name</div>
                <div className="col-span-2">Domain</div>
                <div className="col-span-2">Employees</div>
                <div className="col-span-2">Plan</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="grid grid-cols-12 gap-4 py-3 border-b items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-3">
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {company.adminEmail}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm">{company.domain}</div>
                  <div className="col-span-2">
                    <div className="flex items-center text-sm">
                      <Users className="size-3 mr-1 text-muted-foreground" />
                      {company.employeeCount}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm">{company.planType}</div>
                  <div className="col-span-2">
                    {getStatusBadge(company.status)}
                  </div>
                  <div className="col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="mr-2 size-4" />
                          Edit Company
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="mr-2 size-4" />
                          Manage Users
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 size-4" />
                          View Documents
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
