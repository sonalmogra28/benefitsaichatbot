'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CompanyWithStats } from '@/lib/types/super-admin';

interface CreateCompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: any) => void;
  company?: CompanyWithStats | null;
}

export function CreateCompanyDialog({
  isOpen,
  onClose,
  onSave,
  company,
}: CreateCompanyDialogProps) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDomain(company.domain || '');
      setAdminEmail('');
    } else {
      setName('');
      setDomain('');
      setAdminEmail('');
    }
  }, [company]);

  const handleSave = () => {
    onSave({
      id: company?.id,
      name,
      domain,
      adminEmail: !company ? adminEmail : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Create Company'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          {!company && (
            <div>
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
