'use client';

import React, { useState } from 'react';

export default function CheckMSG91StatusPage() {
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // Check multiple MSG91 endpoints to determine account status
      const checks = [];

      // 1. Check balance (basic auth key validation)
      try {
        const balanceRes = await fetch(`https://api.msg91.com/api/balance.php?authkey=424608A3Z7MMnI0Q68751e0dP1`);
        const balanceData = await balanceRes.text();
        checks.push({
          test: 'Balance Check (SMS Auth)',
          status: balanceRes.status,
          success: balanceRes.ok && !balanceData.includes('Please provide valid auth key'),
          response: balanceData,
          meaning: balanceRes.ok ? 'Your SMS auth key is valid' : 'Your auth key may be invalid'
        });
      } catch (error) {
        checks.push({
          test: 'Balance Check (SMS Auth)',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 2. Check WhatsApp endpoint
      try {
        const whatsappRes = await fetch('https://api.msg91.com/api/v5/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': '424608A3Z7MMnI0Q68751e0dP1'
          },
          body: JSON.stringify({
            integrated_number: '+915422982253',
            content_type: 'text',
            payload: { text: 'test' },
            recipient_whatsapp: '917977828994'
          })
        });
        
        const whatsappData = await whatsappRes.json();
        checks.push({
          test: 'WhatsApp API Access',
          status: whatsappRes.status,
          success: whatsappRes.ok && whatsappData.type !== 'error',
          response: whatsappData,
          meaning: whatsappRes.status === 401 ? 'No WhatsApp Business API access' : 
                   whatsappRes.ok ? 'WhatsApp API is accessible' : 'WhatsApp API error'
        });
      } catch (error) {
        checks.push({
          test: 'WhatsApp API Access',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 3. Check account info
      try {
        const accountRes = await fetch(`https://api.msg91.com/api/v5/user/getDetails?authkey=424608A3Z7MMnI0Q68751e0dP1`);
        const accountData = await accountRes.json();
        checks.push({
          test: 'Account Details',
          status: accountRes.status,
          success: accountRes.ok,
          response: accountData,
          meaning: accountRes.ok ? 'Account details accessible' : 'Cannot access account details'
        });
      } catch (error) {
        checks.push({
          test: 'Account Details',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      setResults(checks);
    } catch (error) {
      console.error('Status check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 MSG91 Account Status Check</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h3>Your Current Configuration:</h3>
        <p><strong>Auth Key:</strong> 424608A3Z7MMnI0Q68751e0dP1</p>
        <p><strong>Phone Number:</strong> +915422982253</p>
        <p><strong>Purpose:</strong> WhatsApp Business messaging</p>
      </div>

      <button
        onClick={checkStatus}
        disabled={isLoading}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '1rem',
          marginBottom: '2rem'
        }}
      >
        {isLoading ? 'Checking...' : 'Check MSG91 Status'}
      </button>

      {results && (
        <div>
          <h2>📊 Test Results:</h2>
          {results.map((result: any, index: number) => (
            <div key={index} style={{
              marginBottom: '1rem',
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da'
            }}>
              <h3>{result.success ? '✅' : '❌'} {result.test}</h3>
              <p><strong>Status:</strong> {result.status || 'N/A'}</p>
              <p><strong>Meaning:</strong> {result.meaning}</p>
              
              {result.response && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary>View Response</summary>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    overflow: 'auto'
                  }}>
                    {typeof result.response === 'string' ? result.response : JSON.stringify(result.response, null, 2)}
                  </pre>
                </details>
              )}
              
              {result.error && (
                <p style={{ color: 'red' }}><strong>Error:</strong> {result.error}</p>
              )}
            </div>
          ))}

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <h3>🎯 What This Means:</h3>
            <ul>
              <li><strong>If SMS Auth ✅:</strong> Your basic auth key works for SMS</li>
              <li><strong>If WhatsApp ❌:</strong> You need WhatsApp Business API approval</li>
              <li><strong>If Account Details ✅:</strong> Your account is active</li>
            </ul>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
            <h3>📞 Next Steps:</h3>
            <ol>
              <li><strong>Contact MSG91 Support:</strong> Ask to enable WhatsApp Business API</li>
              <li><strong>Business Verification:</strong> Provide business documents if required</li>
              <li><strong>WhatsApp Number Setup:</strong> Register +915422982253 with WhatsApp Business</li>
              <li><strong>Get WhatsApp Auth Token:</strong> Different from SMS auth key</li>
            </ol>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e2e3e5', borderRadius: '4px' }}>
        <h3>🔑 Auth Key Types in MSG91:</h3>
        <ul>
          <li><strong>SMS Auth Key:</strong> For SMS services (what you have)</li>
          <li><strong>WhatsApp Auth Token:</strong> For WhatsApp Business API (what you need)</li>
          <li><strong>Voice Auth Key:</strong> For voice calls</li>
          <li><strong>Email Auth Key:</strong> For email services</li>
        </ul>
        <p><strong>Note:</strong> Each service may require separate authentication and approval.</p>
      </div>
    </div>
  );
}