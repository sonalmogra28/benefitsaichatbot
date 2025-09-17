/**
 * Subdomain Provider Component
 * Provides subdomain-specific context and functionality
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createDeploymentManager } from '@/lib/deployment';
import { SubdomainDeployment } from '@/lib/deployment/subdomain-deployment';

interface SubdomainContextType {
  tenantId: string;
  deploymentManager: ReturnType<typeof createDeploymentManager>;
  subdomainDeployment: SubdomainDeployment | null;
  userInfo: {
    email: string;
    employeeId: string;
    companyId: string;
    groups: string[];
    firstName?: string;
    lastName?: string;
  } | null;
}

const SubdomainContext = createContext<SubdomainContextType | null>(null);

export function useSubdomain() {
  const context = useContext(SubdomainContext);
  if (!context) {
    throw new Error('useSubdomain must be used within a SubdomainProvider');
  }
  return context;
}

interface SubdomainProviderProps {
  children: React.ReactNode;
  tenantId: string;
}

export function SubdomainProvider({ children, tenantId }: SubdomainProviderProps) {
  const [deploymentManager, setDeploymentManager] = useState<ReturnType<typeof createDeploymentManager> | null>(null);
  const [subdomainDeployment, setSubdomainDeployment] = useState<SubdomainDeployment | null>(null);
  const [userInfo, setUserInfo] = useState<SubdomainContextType['userInfo']>(null);

  useEffect(() => {
    try {
      const manager = createDeploymentManager(tenantId);
      setDeploymentManager(manager);

      if (manager.isSubdomainDeployment()) {
        const subdomainConfig = manager.getSubdomainConfig();
        if (subdomainConfig) {
          const deployment = new SubdomainDeployment(subdomainConfig, tenantId);
          setSubdomainDeployment(deployment);
        }
      }

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
      logger.error('Error initializing subdomain provider:', error);
    }
  }, [tenantId]);

  if (!deploymentManager) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading benefits assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <SubdomainContext.Provider
      value={{
        tenantId,
        deploymentManager,
        subdomainDeployment,
        userInfo,
      }}
    >
      {children}
    </SubdomainContext.Provider>
  );
}
