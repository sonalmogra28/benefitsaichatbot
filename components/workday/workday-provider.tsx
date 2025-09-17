/**
 * Workday Provider Component
 * Provides Workday-specific context and functionality
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createDeploymentManager } from '@/lib/deployment';
import { WorkdayIntegration } from '@/lib/deployment/workday-integration';

interface WorkdayContextType {
  tenantId: string;
  deploymentManager: ReturnType<typeof createDeploymentManager>;
  workdayIntegration: WorkdayIntegration | null;
  isEmbedded: boolean;
  userInfo: {
    email: string;
    employeeId: string;
    companyId: string;
    groups: string[];
    firstName?: string;
    lastName?: string;
  } | null;
}

const WorkdayContext = createContext<WorkdayContextType | null>(null);

export function useWorkday() {
  const context = useContext(WorkdayContext);
  if (!context) {
    throw new Error('useWorkday must be used within a WorkdayProvider');
  }
  return context;
}

interface WorkdayProviderProps {
  children: React.ReactNode;
  tenantId: string;
}

export function WorkdayProvider({ children, tenantId }: WorkdayProviderProps) {
  const [deploymentManager, setDeploymentManager] = useState<ReturnType<typeof createDeploymentManager> | null>(null);
  const [workdayIntegration, setWorkdayIntegration] = useState<WorkdayIntegration | null>(null);
  const [userInfo, setUserInfo] = useState<WorkdayContextType['userInfo']>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    try {
      const manager = createDeploymentManager(tenantId);
      setDeploymentManager(manager);

      if (manager.isWorkdayDeployment()) {
        const workdayConfig = manager.getWorkdayConfig();
        if (workdayConfig) {
          const integration = new WorkdayIntegration(
            {
              issuer: workdayConfig.ssoConfig.issuer,
              ssoUrl: workdayConfig.ssoConfig.ssoUrl,
              certificate: workdayConfig.ssoConfig.certificate,
              jwksUrl: workdayConfig.ssoConfig.jwksUrl,
              requiredClaims: ['email', 'employeeId', 'companyId', 'groups'],
            },
            {
              containerId: workdayConfig.embedConfig.containerId,
              theme: workdayConfig.embedConfig.theme,
              height: workdayConfig.embedConfig.height,
              width: workdayConfig.embedConfig.width,
              responsive: true,
            },
            tenantId
          );
          setWorkdayIntegration(integration);
        }
      }

      // Check if we're embedded in an iframe
      setIsEmbedded(window !== window.parent);

      // Mock user info - in real implementation, this would come from SSO
      setUserInfo({
        email: 'user@amerivet.com',
        employeeId: 'EMP001',
        companyId: tenantId,
        groups: ['employee'],
        firstName: 'John',
        lastName: 'Doe',
      });
    } catch (error) {
      logger.error('Error initializing Workday provider:', error);
    }
  }, [tenantId]);

  if (!deploymentManager) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading Workday integration...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkdayContext.Provider
      value={{
        tenantId,
        deploymentManager,
        workdayIntegration,
        isEmbedded,
        userInfo,
      }}
    >
      {children}
    </WorkdayContext.Provider>
  );
}
