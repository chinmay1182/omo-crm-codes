import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Omo Digital CRM',
  description: 'Welcome to my app',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/v6.7.1/css/all.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-duotone-solid.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-duotone-regular.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-light.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-regular.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-duotone-light.css" />
        <link rel="stylesheet" href="/v6.7.1/css/sharp-thin.css" />
      </head>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4aed88',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#f87171',
                    secondary: '#fff',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#fff',
                  },
                },
              }}
            />

          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
