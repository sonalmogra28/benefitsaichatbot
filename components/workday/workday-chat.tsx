/**
 * Workday-specific Chat Component
 * Optimized for Workday embedding and integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useWorkday } from './workday-provider';
import { Chat } from '@/components/chat';
import { WorkdayHeader } from './workday-header';
import { WorkdayNavigation } from './workday-navigation';

interface WorkdayChatProps {
  tenantId: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  embedMode?: boolean;
}

export function WorkdayChat({ tenantId, branding, embedMode = false }: WorkdayChatProps) {
  const { deploymentManager, isEmbedded, userInfo } = useWorkday();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Apply Workday-specific styling
    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);
    root.style.setProperty('--font-family', branding.fontFamily);

    // Add Workday-specific classes
    document.body.classList.add('workday-embedded');
    
    if (embedMode) {
      document.body.classList.add('workday-iframe');
    }

    setIsReady(true);

    return () => {
      document.body.classList.remove('workday-embedded', 'workday-iframe');
    };
  }, [branding, embedMode]);

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
      {!embedMode && (
        <WorkdayHeader 
          tenantId={tenantId}
          branding={branding}
          userInfo={userInfo}
        />
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {!embedMode && (
          <WorkdayNavigation 
            tenantId={tenantId}
            branding={branding}
          />
        )}
        
        <div className="flex-1 flex flex-col">
          <Chat
            id={`workday-${tenantId}`}
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
