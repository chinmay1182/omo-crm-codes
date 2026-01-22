'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is authenticated, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // If user is not authenticated, redirect to login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading while determining where to redirect
  // Show blank screen while determining where to redirect
  return null;
}