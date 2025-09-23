'use client';

import { useEffect, useState } from 'react';

interface HydrationSafeProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * HydrationSafe component prevents hydration mismatches by ensuring
 * the component only renders on the client side after hydration is complete.
 * This helps prevent issues with browser extensions that modify the DOM.
 */
export function HydrationSafe({ children, fallback = null }: HydrationSafeProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side and fully hydrated
    if (typeof window !== 'undefined') {
      // Use a small delay to ensure all browser extensions have finished modifying the DOM
      const timer = setTimeout(() => {
        setIsHydrated(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  // Show fallback during SSR and initial hydration
  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check if the component is hydrated on the client side
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
    }
  }, []);

  return isHydrated;
}
