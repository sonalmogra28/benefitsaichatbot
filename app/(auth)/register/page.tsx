import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-black">Create an Account</h1>
        <p className="text-muted-foreground">
          Get started with your benefits assistant.
        </p>
      </div>
      <AuthForm type="register" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-bold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
