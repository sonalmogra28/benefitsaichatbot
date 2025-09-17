/**
 * Subdomain-specific Chat Component
 * Optimized for subdomain deployment
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSubdomain } from './subdomain-provider';
import { Chat } from '@/components/chat';
import { SubdomainHeader } from './subdomain-header';
import { SubdomainNavigation } from './subdomain-navigation';

interface SubdomainChatProps {
  tenantId: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  subdomainConfig: {
    domain: string;
    ssl: boolean;
    cdn: boolean;
  };
}

export function SubdomainChat({ tenantId, branding, subdomainConfig }: SubdomainChatProps) {
  const { deploymentManager, userInfo } = useSubdomain();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Apply subdomain-specific styling
    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);
    root.style.setProperty('--font-family', branding.fontFamily);

    // Add subdomain-specific classes
    document.body.classList.create('subdomain-deployed');
    
    // Set page title
    document.title = `Benefits Assistant - ${tenantId}`;

    setIsReady(true);

    return () => {
      document.body.classList.remove('subdomain-deployed');
    };
  }, [branding, tenantId]);

  if (!isReady || !deploymentManager) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading Benefits Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <SubdomainHeader 
        tenantId={tenantId}
        branding={branding}
        subdomainConfig={subdomainConfig}
        userInfo={userInfo}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <SubdomainNavigation 
          tenantId={tenantId}
          branding={branding}
        />
        
        <div className="flex-1 flex flex-col">
          <Chat
            id={`subdomain-${tenantId}`}
            initialMessages={[]}
            initialChatModel="gpt-4o"
            initialVisibilityType="public"
            isReadonly={false}
            autoResume={true}
          />
        </div>
      </div>
    </div>
  );
}
