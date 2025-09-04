// components/mfa-verification.tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PhoneAuthProvider } from 'firebase/auth';

export function MfaVerification({ resolver }: { resolver: any }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      const cred = PhoneAuthProvider.credential(
        resolver.hints[0].verificationId,
        verificationCode,
      );
      const userCredential = await resolver.resolveSignIn(cred);
      // The user is now signed in.
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Enter Verification Code</h2>
      <p>A verification code has been sent to your phone.</p>
      <Input
        type="text"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        placeholder="Enter verification code"
      />
      <Button onClick={handleVerify} className="mt-2">
        Verify and Sign In
      </Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
