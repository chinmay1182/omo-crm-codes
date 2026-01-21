'use client';

import { useEffect } from 'react';

export default function ForceLogoutPage() {
    useEffect(() => {
        // 1. Clear Local Storage
        localStorage.clear();
        sessionStorage.clear();

        // 2. Clear Cookies Aggressively
        document.cookie.split(';').forEach(c => {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
        });

        // Also try clearing specifically named cookies just in case
        document.cookie = 'agent_session=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
        document.cookie = 'agent-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
        document.cookie = 'session=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';

        // 3. Hard Redirect to Agent Login
        setTimeout(() => {
            // Use window.location.href to force a full browser refresh
            window.location.href = '/agent-login';
        }, 1000);
    }, []);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'system-ui',
            flexDirection: 'column'
        }}>
            <h1>Logging out safely...</h1>
            <p>Clearing all data and redirecting.</p>
            <div style={{ marginTop: '20px', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ccc', borderTopColor: 'blue', animation: 'spin 1s linear infinite' }}></div>
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
