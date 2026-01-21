// Refined navigation guard that doesn't cause page reloads
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export function useNavigationGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Handle direct navigation attempts (when component mounts or auth state changes)
  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname.startsWith('/auth') || pathname === '/';
    const isDashboardPage = pathname.startsWith('/dashboard');

    // Redirect logged-in users away from auth pages and root
    if (user && isAuthPage) {
      router.replace('/dashboard');
      return;
    }

    // Only redirect non-authenticated users away from dashboard if we're sure they're not authenticated
    // Add a small delay to avoid race conditions with session loading
    if (!user && isDashboardPage) {
      // Give a small delay to allow session to load
      const timeoutId = setTimeout(() => {
        // Check again after delay - if still no user, then redirect
        if (!user) {
          router.replace('/login');
        }
      }, 500); // 500ms delay to allow session loading

      return () => clearTimeout(timeoutId);
    }

    // Redirect non-authenticated users from root to login
    if (!user && pathname === '/') {
      router.replace('/login');
      return;
    }
  }, [user, loading, pathname, router]);

  // Handle browser back/forward navigation (less aggressive approach)
  useEffect(() => {
    if (loading) return;

    const handlePopState = () => {
      // Small delay to let the navigation complete, then check if we need to redirect
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || currentPath.startsWith('/auth') || currentPath === '/';
        const isDashboardPage = currentPath.startsWith('/dashboard');

        if (user && isAuthPage) {
          router.replace('/dashboard');
        } else if (!user && isDashboardPage) {
          router.replace('/login');
        }
      }, 100); // Small delay to avoid conflicts
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, loading, router]);
}