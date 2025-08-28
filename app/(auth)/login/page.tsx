'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { USER_ROLES } from '@/lib/constants/roles';
import { motion } from 'framer-motion';

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
        
        // Get the ID token for session creation
        const idToken = await user.getIdToken();
        
        // Create session using proper Firebase session cookies
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        
        if (!sessionResponse.ok) {
          console.error('Session creation failed');
          throw new Error('Failed to create session');
        }
        
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
        console.error('Firebase auth failed:', firebaseError.code);
        const errorMessage = firebaseError.message || firebaseError.code || '';

        // Check for specific Firebase errors and set appropriate messages
        if (errorMessage.includes('user-not-found') || errorMessage.includes('invalid-credential')) {
          setError('Invalid email or password.');
        } else if (errorMessage.includes('wrong-password')) {
          setError('Incorrect password.');
        } else if (errorMessage.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else if (errorMessage.includes('too-many-requests')) {
          setError('Too many failed attempts. Try again later.');
        } else if (errorMessage.includes('auth/invalid-api-key') || errorMessage.includes('unauthorized-domain')) {
          setError('Authentication system offline. Try demo mode.');
        } else {
          setError('Login failed. Please try again.');
        }
        // Note: The original code attempted demo mode here. This is removed
        // in this corrected version to simplify the error handling structure.
        // If demo mode is a requirement, it needs to be integrated differently,
        // perhaps before the initial Firebase attempt or in a separate flow.
      }
    } catch (generalError: any) {
      console.error('General login error:', generalError);
      setError('An unexpected error occurred. Please try again.');
    }
    finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Get the ID token for session creation
      const idToken = await user.getIdToken();
      
      // Create session using proper Firebase session cookies
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      if (!sessionResponse.ok) {
        console.error('Session creation failed');
        throw new Error('Failed to create session');
      }
      
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
        setError('Google login failed.');
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
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-white to-gray-200">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
                             radial-gradient(circle at 40% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`
          }} />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-white p-10 rounded-none">
            <h1 className="text-4xl font-black tracking-tight mb-3 text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
              RESET PASSWORD
            </h1>
            <p className="text-lg text-black mb-8" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
              We'll email you a reset link
            </p>
            
            <form onSubmit={handlePasswordReset}>
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="reset-email" className="text-base font-bold mb-2 block text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
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
                    className="h-14 text-base font-medium border-2 border-black focus:border-black text-black placeholder-gray-500 bg-white/50"
                    style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                  />
                </motion.div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Alert variant="destructive" className="border-2 border-black bg-black text-white">
                      <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-14 text-base font-bold bg-black text-white hover:bg-gray-900 border-2 border-black transition-all duration-200"
                      disabled={loading}
                      style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                    >
                      {loading ? 'SENDING...' : 'SEND RESET LINK'}
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-12 text-base font-bold hover:bg-black/5 text-black"
                      onClick={() => {
                        setShowResetForm(false);
                        setError(null);
                      }}
                      style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                    >
                      BACK TO SIGN IN
                    </Button>
                  </motion.div>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <motion.div 
          className="absolute inset-0"
          animate={{
            backgroundImage: [
              `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 40% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 20% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 60% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`,
              `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 40% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <div className="w-full max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left space-y-8"
          >
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-6xl lg:text-7xl font-black tracking-tight leading-none text-black" 
                style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
              >
                BENEFITS
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="block text-black"
                >
                  ASSISTANT
                </motion.span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-xl lg:text-2xl leading-relaxed text-black" 
                style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
              >
                Your intelligent benefits companion powered by AI
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold mb-1 text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                  AI-POWERED INSIGHTS
                </h3>
                <p className="text-base text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                  Get instant answers and personalized recommendations
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-1 text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                  ENTERPRISE SECURITY
                </h3>
                <p className="text-base text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                  HIPAA compliant with bank-level encryption
                </p>
              </div>
            </motion.div>
            
          </motion.div>
          
          {/* Right Side - Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-white p-10 glass-hover"
          >
            <h2 className="text-3xl font-black mb-8 text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
              WELCOME BACK
            </h2>
            
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Label htmlFor="email" className="text-base font-bold mb-2 block text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                  EMAIL ADDRESS
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="h-14 text-base font-medium border-2 border-black focus:border-black text-black placeholder-gray-500 bg-white/50 transition-all duration-200"
                  style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-base font-bold text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                    PASSWORD
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm font-bold hover:underline text-black transition-all duration-200"
                    style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                  >
                    FORGOT?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-14 text-base font-medium border-2 border-black focus:border-black text-black placeholder-gray-500 bg-white/50 transition-all duration-200"
                  style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                />
              </motion.div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert variant="destructive" className="border-2 border-black bg-black text-white">
                    <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              {resetEmailSent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="border-2 border-black bg-white/90">
                    <AlertDescription className="text-sm font-medium text-black">
                      Reset link sent! Check your email.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-4"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-base font-bold bg-black text-white hover:bg-gray-900 border-2 border-black transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={loading}
                    style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                  >
                    {loading ? 'SIGNING IN...' : 'SIGN IN'}
                  </Button>
                </motion.div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-black" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white/90 px-4 font-bold text-black" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                      OR
                    </span>
                  </div>
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-14 text-base font-bold border-2 border-black hover:bg-black hover:text-white text-black transition-all duration-200"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                  >
                    CONTINUE WITH GOOGLE
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-base text-black" 
                style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
              >
                New to Benefits Assistant?{' '}
                <Link href="/register" className="font-bold hover:underline transition-all duration-200">
                  CREATE ACCOUNT
                </Link>
              </motion.p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}