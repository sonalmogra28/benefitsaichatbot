'use client';

import { useEffect } from 'react';

export default function InstantAdminPage() {
  useEffect(() => {
    // Immediately set admin session and redirect
    sessionStorage.setItem('authMode', 'demo');
    sessionStorage.setItem(
      'mockUser',
      JSON.stringify({
        uid: 'demo-super-001',
        email: 'superadmin@test.com',
        displayName: 'Sarah Super Admin',
        role: 'super_admin',
        emailVerified: true,
      }),
    );

    // Immediate redirect
    window.location.href = '/super-admin';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1
          className="text-4xl font-black mb-4"
          style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        >
          LOADING ADMIN...
        </h1>
      </div>
    </div>
  );
}
