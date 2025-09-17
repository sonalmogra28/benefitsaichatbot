/**
 * Workday embed page
 * Optimized for iframe embedding in Workday Extend
 */

import { notFound } from 'next/navigation';
import { createDeploymentManager } from '@/lib/deployment';
import { WorkdayChat } from '@/components/workday/workday-chat';

interface WorkdayEmbedProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function WorkdayEmbedPage({ params }: WorkdayEmbedProps) {
  const { tenantId } = await params;

  try {
    const deploymentManager = createDeploymentManager(tenantId);
    
    if (!deploymentManager.isWorkdayDeployment()) {
      notFound();
    }

    const workdayConfig = deploymentManager.getWorkdayConfig();
    const branding = deploymentManager.getBrandingConfig();

    return (
      <div 
        className="h-full w-full bg-white"
        style={{
          height: workdayConfig?.embedConfig.height || '100vh',
          width: workdayConfig?.embedConfig.width || '100%',
        }}
      >
        <WorkdayChat 
          tenantId={tenantId}
          branding={branding}
          embedMode={true}
        />
      </div>
    );
  } catch (error) {
    logger.error('Error loading Workday embed:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  
  return {
    title: `Benefits Assistant - ${tenantId}`,
    description: 'AI-powered benefits assistant',
    robots: 'noindex, nofollow',
  };
}
