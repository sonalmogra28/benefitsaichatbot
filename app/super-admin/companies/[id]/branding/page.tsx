import { CompanyBrandingForm } from '@/components/super-admin/company-branding-form';

export default function CompanyBrandingPage({ params }: { params: { id: string } }) {
  return <CompanyBrandingForm companyId={params.id} />;
}
