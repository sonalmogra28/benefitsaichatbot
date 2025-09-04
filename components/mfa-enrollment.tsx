// components/mfa-enrollment.tsx
'use client';

import { useSession } from '@/hooks/use-session';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import {
  getAuth,
  RecaptchaVerifier,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
} from 'firebase/auth';

export function MfaEnrollment() {
  const { session } = useSession();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const auth = getAuth();

  const handleEnroll = async () => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
        },
      );

      if (!auth.currentUser) {
        setError('User not authenticated');
        return;
      }

      const phoneInfoOptions = {
        phoneNumber,
        session: await auth.currentUser.getIdTokenResult(true),
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifier,
      );

      setVerificationId(verificationId);
      setSuccess('Verification code sent to your phone.');
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setSuccess(null);
    }
  };

  const handleVerify = async () => {
    try {
      if (!auth.currentUser) {
        setError('User not authenticated');
        return;
      }

      const cred = PhoneAuthProvider.credential(
        verificationId,
        verificationCode,
      );
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      const multiFactor = (auth.currentUser as any).multiFactor;
      if (multiFactor) {
        await multiFactor.enroll(multiFactorAssertion, phoneNumber);
      } else {
        throw new Error('Multi-factor not available');
      }
      setSuccess('Multi-factor authentication has been enabled.');
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setSuccess(null);
    }
  };

  return (
    <div className="space-y-4">
      <div id="recaptcha-container" />
      <div>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number (e.g., +16505551234)"
        />
        <Button onClick={handleEnroll} className="mt-2">
          Send Verification Code
        </Button>
      </div>

      {verificationId && (
        <div>
          <Input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter verification code"
          />
          <Button onClick={handleVerify} className="mt-2">
            Verify and Enroll
          </Button>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
    </div>
  );
}
