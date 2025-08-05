'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/toast';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FEATURES = [
  { id: 'chat_enabled', label: 'Chat Enabled', default: true },
  { id: 'document_upload', label: 'Document Upload', default: true },
  { id: 'custom_branding', label: 'Custom Branding', default: false },
  { id: 'advanced_analytics', label: 'Advanced Analytics', default: false },
  { id: 'api_access', label: 'API Access', default: false },
  { id: 'sso_enabled', label: 'SSO Enabled', default: false },
  { id: 'priority_support', label: 'Priority Support', default: false },
];

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    adminEmail: '',
    billingPlan: 'starter',
    features: FEATURES.filter(f => f.default).map(f => f.id),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/super-admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      toast({
        type: 'success',
        description: `${formData.name} has been created successfully.`,
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        domain: '',
        adminEmail: '',
        billingPlan: 'starter',
        features: FEATURES.filter(f => f.default).map(f => f.id),
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to create company. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Set up a new company account with an admin user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="acme.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@acme.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billingPlan">Billing Plan</Label>
              <Select
                value={formData.billingPlan}
                onValueChange={(value) => setFormData({ ...formData, billingPlan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="grid grid-cols-2 gap-4">
                {FEATURES.map((feature) => (
                  <div key={feature.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature.id}
                      checked={formData.features.includes(feature.id)}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                    <Label
                      htmlFor={feature.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}