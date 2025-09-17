/**
 * Workday-specific layout
 * Handles Workday embedding and SSO integration
 */

import { notFound } from 'next/navigation';
import { createDeploymentManager } from '@/lib/deployment';
import { WorkdayProvider } from '@/components/workday/workday-provider';

interface WorkdayLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function WorkdayLayout({
  children,
  params,
}: WorkdayLayoutProps) {
  const { tenantId } = await params;

  try {
    const deploymentManager = createDeploymentManager(tenantId);
    
    if (!deploymentManager.isWorkdayDeployment()) {
      notFound();
    }

    return (
      <WorkdayProvider tenantId={tenantId}>
        <div className="workday-container h-full w-full">
          {children}
        </div>
      </WorkdayProvider>
    );
  } catch (error) {
    logger.error('Error loading Workday layout:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  
  return {
    title: `Benefits Assistant - ${tenantId}`,
    description: 'AI-powered benefits assistant integrated with Workday',
    robots: 'noindex, nofollow', // Prevent indexing of embedded content
  };
}
