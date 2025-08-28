'use client';

import { useEffect } from 'react';

export default function InstantDemoPage() {
  useEffect(() => {
    // Immediately set demo session and redirect
    sessionStorage.setItem('authMode', 'demo');
    sessionStorage.setItem('mockUser', JSON.stringify({
      uid: 'demo-employee-001',
      email: 'employee@acme.com',
      displayName: 'John Employee',
      role: 'employee',
      companyId: 'acme-corp',
      emailVerified: true
    }));
    
    // Immediate redirect
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
          LOADING DEMO...
        </h1>
      </div>
    </div>
  );
}