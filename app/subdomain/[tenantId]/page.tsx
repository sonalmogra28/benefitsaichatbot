/**
 * Subdomain main page
 * Landing page for subdomain deployment
 */

import { notFound } from 'next/navigation';
import { createDeploymentManager } from '@/lib/deployment';
import { SubdomainChat } from '@/components/subdomain/subdomain-chat';

interface SubdomainPageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function SubdomainPage({ params }: SubdomainPageProps) {
  const { tenantId } = await params;

  try {
    const deploymentManager = createDeploymentManager(tenantId);
    
    if (!deploymentManager.isSubdomainDeployment()) {
      notFound();
    }

    const branding = deploymentManager.getBrandingConfig();
    const subdomainConfig = deploymentManager.getSubdomainConfig();

    return (
      <div className="h-full w-full">
        <SubdomainChat 
          tenantId={tenantId}
          branding={branding}
          subdomainConfig={subdomainConfig}
        />
      </div>
    );
  } catch (error) {
    logger.error('Error loading subdomain page:', error);
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
