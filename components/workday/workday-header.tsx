/**
 * Workday Header Component
 * Displays Workday-specific header with branding and user info
 */

'use client';

import React from 'react';
import { useWorkday } from './workday-provider';

interface WorkdayHeaderProps {
  tenantId: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  userInfo: {
    email: string;
    employeeId: string;
    companyId: string;
    groups: string[];
    firstName?: string;
    lastName?: string;
  } | null;
}

export function WorkdayHeader({ tenantId, branding, userInfo }: WorkdayHeaderProps) {
  const { workdayIntegration } = useWorkday();

  return (
    <header 
      className="bg-white border-b border-gray-200 px-4 py-3"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <img
              src={branding.logo}
              alt="Amerivet Benefits"
              className="h-8 w-auto"
              onError={(e) => {
                // Fallback to text logo if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden text-white font-bold text-lg">
              Amerivet Benefits
            </div>
          </div>
          <div className="text-white">
            <h1 className="text-lg font-semibold">Benefits Assistant</h1>
            <p className="text-sm opacity-90">AI-powered benefits guidance</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {userInfo && (
            <div className="text-white text-sm">
              <div className="font-medium">
                {userInfo.firstName} {userInfo.lastName}
              </div>
              <div className="opacity-90">
                {userInfo.employeeId}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                // Workday-specific help action
                if (workdayIntegration) {
                  // This would integrate with Workday's help system
                  logger.info('Opening Workday help');
                }
              }}
              className="text-white hover:text-gray-200 transition-colors"
              title="Help"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                // Workday-specific settings action
                if (workdayIntegration) {
                  // This would integrate with Workday's settings
                  logger.info('Opening Workday settings');
                }
              }}
              className="text-white hover:text-gray-200 transition-colors"
              title="Settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
