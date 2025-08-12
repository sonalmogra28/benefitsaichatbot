// components/super-admin/companies-table.tsx
'use client';

import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/utils';
import type { Company } from '@/lib/db/schema';

export function CompaniesTable() {
  const { data: companies, error } = useSWR<Company[]>('/api/super-admin/companies', fetcher);

  if (error) return <div>Failed to load companies</div>;
  if (!companies) return <div>Loading...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Domain</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.id}>
            <TableCell>{company.name}</TableCell>
            <TableCell>{company.domain}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
