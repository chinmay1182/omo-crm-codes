// Component to prevent authenticated users from accessing login page
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigationGuard } from '@/app/hooks/useNavigationGuard';
import { useEffect, useState } from 'react';

export default function LoginGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use navigation guard to prevent browser back/forward issues
  useNavigationGuard();

  useEffect(() => {
    if (!loading && user) {
      setIsRedirecting(true);
      // Replace history to prevent back navigation to login
      window.history.replaceState(null, '', '/dashboard');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);



  // Don't render login form if user is already authenticated
  if (user) {
    return null;
  }

  return <>{children}</>;
}