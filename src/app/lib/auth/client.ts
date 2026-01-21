'use client';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];
}

export function clearAuthToken() {
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}