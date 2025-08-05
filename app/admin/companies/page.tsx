'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompaniesTable } from '@/components/super-admin/companies-table';
import { CreateCompanyDialog } from '@/components/super-admin/create-company-dialog';
import { toast } from '@/components/toast';
import { Plus, RefreshCw } from 'lucide-react';
import type { CompanyWithStats } from '@/lib/types/super-admin';

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/companies?page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      setCompanies(data.companies);
      setTotal(data.total);
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to load companies',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page]);

  const handleEdit = (company: CompanyWithStats) => {
    router.push(`/admin/companies/${company.id}/edit`);
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      toast({
        type: 'success',
        description: 'The company has been deleted successfully.',
      });

      fetchCompanies();
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to delete company',
      });
    }
  };

  const handleViewDetails = (companyId: string) => {
    router.push(`/admin/companies/${companyId}`);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground">Manage all companies on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchCompanies}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Company
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies ({total})</CardTitle>
          <CardDescription>
            View and manage all companies registered on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading companies...
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found. Create your first company to get started.
            </div>
          ) : (
            <CompaniesTable
              companies={companies}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          )}
        </CardContent>
      </Card>

      <CreateCompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCompanies}
      />

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}