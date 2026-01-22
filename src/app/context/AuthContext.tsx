// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: any;
  loading: boolean;
  login: (email: string, password: string, userType?: 'user' | 'agent') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        // Small delay to ensure cookies are available
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check for agent_session cookie first (for agents)
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        if (cookies.agent_session) {
          try {
            const sessionData = JSON.parse(decodeURIComponent(cookies.agent_session));
            const agent = sessionData.user || sessionData;

            setUser({
              ...agent,
              type: 'agent'
            });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse agent session:', e);
          }
        }

        // Fallback: Try regular session API (for non-agent users)
        try {
          const res = await fetch('/api/auth/session', {
            credentials: 'include',
            cache: 'no-store'
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              setLoading(false);
              return;
            }
          }
        } catch (ignore) {
          // Ignore errors here, expected if user is agent or not logged in
        }

        setUser(null);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [refreshKey]);

  const refreshUser = async () => {
    setLoading(true);
    setRefreshKey(prev => prev + 1);
  };

  // Enhanced login with navigation protection
  const login = async (email: string, password: string, userType: 'user' | 'agent' = 'user') => {
    const endpoint = userType === 'agent' ? '/api/auth/agent-login' : '/api/auth/login';
    const body = userType === 'agent'
      ? JSON.stringify({ username: email, password })
      : JSON.stringify({ email, password });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: include cookies
      body,
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);

      // Clear browser history to prevent back navigation to login
      window.history.replaceState(null, '', '/dashboard');
      router.push('/dashboard');
    } else {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Login failed');
    }
  };

  // Enhanced logout with navigation protection
  const logout = async () => {
    try {
      // Set user to null FIRST to prevent any re-renders showing dashboard
      setUser(null);

      // Clear client-side cookies immediately
      const cookiesToClear = ['agent_session', 'session', 'agent-token', 'auth-token'];
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      });

      // Call server-side logout to clear HttpOnly cookies
      await fetch('/api/debug/force-logout', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include'
      });

      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Determine login path based on user type (before setting to null)
      const loginPath = (user as any)?.type === 'agent' ? '/agent-login' : '/login';

      // Force navigation to login page using window.location (hard redirect)
      // This ensures no cached state remains
      window.location.replace(loginPath);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);