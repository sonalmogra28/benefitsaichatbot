import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-black">Welcome Back</h1>
        <p className="text-muted-foreground">
          Sign in to access your benefits dashboard.
        </p>
      </div>
      <AuthForm type="login" />
      <p className="text-center text-sm text-muted-foreground">
        New to Benefits Assistant?{' '}
        <Link href="/register" className="font-bold hover:underline">
          Create Account
        </Link>
      </p>
    </div>
  );
}
