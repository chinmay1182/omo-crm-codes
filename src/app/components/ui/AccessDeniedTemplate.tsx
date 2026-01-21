import React from 'react';
import Image from 'next/image';

interface AccessDeniedTemplateProps {
    moduleName?: string;
    message?: string;
}

const AccessDeniedTemplate: React.FC<AccessDeniedTemplateProps> = ({ moduleName, message }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: '#64748b'
        }}>
            <div style={{ marginBottom: '20px', position: 'relative', width: '300px', height: '300px' }}>
                <Image
                    src="/pngegg.png"
                    alt="Access Denied"
                    fill
                    style={{ objectFit: 'contain' }}
                />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '300', marginBottom: '10px', color: '#334155' }}>Access Denied</h2>
            <p style={{ maxWidth: '300px', lineHeight: '1.5', fontSize: '16px' }}>
                {message || `You do not have permission to access the ${moduleName || 'requested'} module.`}
            </p>
        </div>
    );
};

export default AccessDeniedTemplate;
