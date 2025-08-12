// app/super-admin/companies/page.tsx
import { CompaniesTable } from '@/components/super-admin/companies-table';
import { CreateCompanyDialog } from '@/components/super-admin/create-company-dialog';

export default function CompaniesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <CreateCompanyDialog />
      </div>
      <CompaniesTable />
    </div>
  );
}
