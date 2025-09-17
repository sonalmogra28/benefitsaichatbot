/**
 * Subdomain-specific layout
 * Handles subdomain deployment and routing
 */

import { notFound } from 'next/navigation';
import { createDeploymentManager } from '@/lib/deployment';
import { SubdomainProvider } from '@/components/subdomain/subdomain-provider';

interface SubdomainLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function SubdomainLayout({
  children,
  params,
}: SubdomainLayoutProps) {
  const { tenantId } = await params;

  try {
    const deploymentManager = createDeploymentManager(tenantId);
    
    if (!deploymentManager.isSubdomainDeployment()) {
      notFound();
    }

    return (
      <SubdomainProvider tenantId={tenantId}>
        <div className="subdomain-container h-full w-full">
          {children}
        </div>
      </SubdomainProvider>
    );
  } catch (error) {
    logger.error('Error loading subdomain layout:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  
  return {
    title: `Benefits Assistant - ${tenantId}`,
    description: 'AI-powered benefits assistant for your organization',
    robots: 'index, follow',
  };
}
