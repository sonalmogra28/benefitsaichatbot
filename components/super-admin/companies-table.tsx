'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Building2, Users, FileText, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CompanyWithStats } from '@/lib/types/super-admin';

interface CompaniesTableProps {
  companies: CompanyWithStats[];
  onEdit: (company: CompanyWithStats) => void;
  onDelete: (companyId: string) => void;
  onViewDetails: (companyId: string) => void;
}

export function CompaniesTable({
  companies,
  onEdit,
  onDelete,
  onViewDetails,
}: CompaniesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search companies..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Chats</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </div>
                    {company.domain && (
                      <div className="text-sm text-muted-foreground">
                        {company.domain}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{company.userCount}</span>
                    <span className="text-xs text-muted-foreground">
                      ({company.monthlyActiveUsers} MAU)
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {company.documentCount}
                  </div>
                </TableCell>
                <TableCell>{company.chatCount}</TableCell>
                <TableCell>
                  {(company.storageUsed / 1024 / 1024).toFixed(1)} MB
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    {company.lastActivity ? (
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(company.lastActivity), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={company.deletedAt ? 'destructive' : 'default'}>
                    {company.deletedAt ? 'Deleted' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(company.id)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(company)}>
                        Edit company
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(company.id)}
                        className="text-destructive"
                      >
                        Delete company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}