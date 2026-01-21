'use client';

import { useState } from 'react';

export default function FixSuperPermissions() {
    const [status, setStatus] = useState('Idle');
    const [logs, setLogs] = useState<string[]>([]);

    const runFix = async () => {
        setStatus('Running...');
        setLogs([]);

        try {
            const response = await fetch('/api/debug/fix-super-role');
            const data = await response.json();

            setLogs(prev => [...prev, JSON.stringify(data, null, 2)]);

            if (response.ok) {
                setStatus('Success! Please logout and login again.');
            } else {
                setStatus('Error: ' + data.error);
            }
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>Fix Super Admin Permissions</h1>
            <p>This will update the 'super' role in the database to have ALL permissions for ALL modules.</p>

            <button
                onClick={runFix}
                style={{
                    padding: '10px 20px',
                    background: 'blue',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Update Super Role Permissions
            </button>

            <div style={{ marginTop: '20px' }}>
                <strong>Status:</strong> {status}
            </div>

            <pre style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
                {logs.join('\n')}
            </pre>
        </div>
    );
}
