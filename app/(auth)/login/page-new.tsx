'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';
import { Building2, Users, Bot, AlertCircle, ArrowRight, Mail, Shield, Zap, ChevronRight } from 'lucide-react';
import { USER_ROLES } from '@/lib/constants/roles';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First try Firebase authentication
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user claims to determine role
        const idTokenResult = await user.getIdTokenResult();
        const userRole = (idTokenResult.claims.role as string) || USER_ROLES.EMPLOYEE;
        
        // Redirect based on role
        if (userRole === USER_ROLES.SUPER_ADMIN) {
          router.push('/super-admin');
        } else if (userRole === USER_ROLES.PLATFORM_ADMIN) {
          router.push('/admin');
        } else if (userRole === USER_ROLES.COMPANY_ADMIN || userRole === USER_ROLES.HR_ADMIN) {
          router.push('/company-admin');
        } else {
          router.push('/');
        }
        return;
      } catch (firebaseError: any) {
        console.log('Firebase auth failed, trying demo mode:', firebaseError.code);
        
        // If Firebase fails, try demo mode
        if (firebaseError.code === 'auth/invalid-credential' || 
            firebaseError.code === 'auth/user-not-found' ||
            firebaseError.code === 'auth/wrong-password' ||
            firebaseError.code === 'auth/invalid-api-key') {
          
          // Try demo authentication
          const { mockAuth, DEMO_USERS } = await import('@/lib/auth/mock-auth');
          
          // Check if this is a demo user
          const demoUser = DEMO_USERS[email.toLowerCase()];
          if (demoUser && demoUser.password === password) {
            // Use mock authentication
            const user = await mockAuth.signInWithEmailAndPassword(email, password);
            
            // Store mock auth state
            sessionStorage.setItem('mockUser', JSON.stringify(user));
            sessionStorage.setItem('authMode', 'demo');
            
            // Show demo mode notification
            setError(null);
            console.log('🎭 Logged in with demo mode');
            
            // Redirect based on role
            if (user.role === USER_ROLES.SUPER_ADMIN) {
              router.push('/super-admin');
            } else if (user.role === USER_ROLES.PLATFORM_ADMIN) {
              router.push('/admin');
            } else if (user.role === USER_ROLES.COMPANY_ADMIN || user.role === USER_ROLES.HR_ADMIN) {
              router.push('/company-admin');
            } else {
              router.push('/');
            }
            return;
          }
        }
        
        // If not a demo user, throw the original error
        throw firebaseError;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || err.code || '';
      
      if (errorMessage.includes('user-not-found') || errorMessage.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (errorMessage.includes('wrong-password')) {
        setError('Incorrect password.');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (errorMessage.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Get user claims to determine role
      const idTokenResult = await user.getIdTokenResult();
      const userRole = idTokenResult.claims.role as string || USER_ROLES.EMPLOYEE;
      
      // Redirect based on role
      if (userRole === USER_ROLES.SUPER_ADMIN) {
        router.push('/super-admin');
      } else if (userRole === USER_ROLES.PLATFORM_ADMIN) {
        router.push('/admin');
      } else if (userRole === USER_ROLES.COMPANY_ADMIN || userRole === USER_ROLES.HR_ADMIN) {
        router.push('/company-admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled.');
      } else {
        setError('Google login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setShowResetForm(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tight">
              Reset Password
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
              We'll send you a link to reset your password
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-3">
                  <Label htmlFor="reset-email" className="text-base font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-14 text-base px-4"
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive" className="border-red-200">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base font-medium">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4 pb-8">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Send Reset Link
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-14 text-base font-semibold"
                  onClick={() => {
                    setShowResetForm(false);
                    setError(null);
                  }}
                >
                  Back to Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="flex min-h-screen">
        {/* Left Panel - Sign In */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Title */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight">Benefits AI</span>
              </div>
              
              <h1 className="text-5xl font-black tracking-tight leading-tight">
                Welcome back
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Sign in to manage your benefits
              </p>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-14 text-base px-4 border-2 focus:border-blue-500 transition-colors"
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-base font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-14 text-base px-4 border-2 focus:border-blue-500 transition-colors"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base font-medium">{error}</AlertDescription>
                </Alert>
              )}
              
              {resetEmailSent && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <Mail className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-base font-medium text-green-700 dark:text-green-400">
                    Password reset email sent! Check your inbox.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-gray-950 px-4 text-gray-500 font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 text-base font-semibold border-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </div>
              
              <p className="text-center text-base text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Right Panel - Features */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-700 p-12 text-white">
          <div className="flex flex-col justify-center max-w-lg mx-auto space-y-12">
            <div>
              <h2 className="text-4xl font-black mb-6">
                Your AI-Powered Benefits Assistant
              </h2>
              <p className="text-xl font-medium text-blue-100 leading-relaxed">
                Get instant answers, compare plans, and make informed decisions about your benefits.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">AI Assistant</h3>
                  <p className="text-base text-blue-100 leading-relaxed">
                    Chat with our AI to understand your benefits and get personalized recommendations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Instant Insights</h3>
                  <p className="text-base text-blue-100 leading-relaxed">
                    Compare plans, calculate costs, and see what's best for your situation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                  <p className="text-base text-blue-100 leading-relaxed">
                    Your data is encrypted and protected. HIPAA compliant and SOC 2 certified.
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
              <h4 className="text-lg font-bold">Demo Credentials</h4>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-blue-100">Employee:</span>
                  <span className="font-mono">employee@acme.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-100">Admin:</span>
                  <span className="font-mono">companyadmin@acme.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-100">Password:</span>
                  <span className="font-mono">TestPass123!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}