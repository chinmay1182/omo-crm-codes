// src/components/ProtectedRoute.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { useEffect, useState } from 'react';
import Spinner from './Spinner/Spinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Bypass authentication for now as requested
  return <>{children}</>;

  /* Original logic commented out
  const { user, loading } = useAuth();
  ...
  */
  /* 
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use navigation guard to prevent browser back/forward issues
  useNavigationGuard();

  useEffect(() => {
    if (!loading && !user) {
      setIsRedirecting(true);
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }

      // Replace history to prevent back navigation
      window.history.replaceState(null, '', '/login');
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading || isRedirecting) {
    return (
      <div className="fullScreenSpinner">
        <Spinner size="large" text={isRedirecting ? "Redirecting..." : "Loading..."} />
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
  */
}