// components/super-admin/document-list.tsx
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
import type { Document } from '@/lib/db/schema';

export function DocumentList() {
  const { data: documents, error } = useSWR<Document[]>(
    '/api/super-admin/documents',
    fetcher,
  );

  if (error) return <div>Failed to load documents</div>;
  if (!documents) return <div>Loading...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell>{document.title}</TableCell>
            <TableCell>{document.companyId}</TableCell>
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
