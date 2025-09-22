/**
 * Workday Navigation Component
 * Provides Workday-specific navigation menu
 */

'use client';

import React from 'react';
import { useWorkday } from './workday-provider';

interface WorkdayNavigationProps {
  tenantId: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
}

export function WorkdayNavigation({ tenantId, branding }: WorkdayNavigationProps) {
  const { workdayIntegration } = useWorkday();

  const navigationItems = workdayIntegration?.generateNavigationItems() || [
    {
      id: 'benefits-chat',
      label: 'Benefits Assistant',
      url: `/workday/${tenantId}/chat`,
      icon: 'chat',
    },
    {
      id: 'benefits-dashboard',
      label: 'Benefits Dashboard',
      url: `/workday/${tenantId}/dashboard`,
      icon: 'dashboard',
    },
    {
      id: 'plan-comparison',
      label: 'Compare Plans',
      url: `/workday/${tenantId}/compare`,
      icon: 'compare',
    },
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      chat: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      dashboard: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      compare: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    };
    return icons[iconName as keyof typeof icons] || icons.chat;
  };

  return (
    <nav className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Benefits
        </h2>
      </div>
      
      <div className="flex-1 px-2 pb-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                style={{
                  backgroundColor: window.location.pathname === item.url ? branding.primaryColor : undefined,
                  color: window.location.pathname === item.url ? 'white' : undefined,
                }}
              >
                <span className="mr-3 flex-shrink-0">
                  {getIcon(item.icon || 'chat')}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Powered by AI</p>
          <p>Integrated with Workday</p>
        </div>
      </div>
    </nav>
  );
}
