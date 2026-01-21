import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This endpoint provides a simple test page for external testing
  const testScript = `
<!DOCTYPE html>
<html>
<head>
    <title>Consolegal CRM - Pingback Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .container { background: #f8f9fa; padding: 30px; border-radius: 10px; }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
        button { background: #15426d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px 5px; }
        button:hover { background: #0f2f4a; }
        pre { background: #e9ecef; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔔 Consolegal CRM - Pingback Endpoint Test</h1>
        <p><strong>Pingback URL:</strong> <code>https://crm.consolegal.com/api/pingback</code></p>
        
        <div id="status"></div>
        
        <h3>Test Actions:</h3>
        <button onclick="testHealth()">Test Health Check</button>
        <button onclick="testPingback()">Test Pingback POST</button>
        <button onclick="testWithSampleData()">Test with Sample Call Data</button>
        
        <h3>Test Results:</h3>
        <div id="results"></div>
        
        <h3>Sample Pingback Data Format:</h3>
        <pre id="sampleData">{
  "callId": "CALL_123456789",
  "callerNumber": "+91987654321",
  "calledNumber": "+91123456789",
  "callDirection": "inbound",
  "callStatus": "ringing",
  "timestamp": "2024-01-15T10:30:00Z",
  "sessionId": "session_abc123",
  "duration": 0,
  "agentId": "agent_001"
}</pre>
    </div>

    <script>
        function updateStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.innerHTML = '<div class="status ' + type + '">' + message + '</div>';
        }
        
        function addResult(message) {
            const results = document.getElementById('results');
            const timestamp = new Date().toLocaleTimeString();
            results.innerHTML += '<div>[' + timestamp + '] ' + message + '</div>';
        }
        
        async function testHealth() {
            updateStatus('Testing health endpoint...', 'info');
            try {
                const response = await fetch('/api/pingback-health');
                const data = await response.json();
                
                if (response.ok) {
                    updateStatus('✅ Health check passed!', 'success');
                    addResult('<span class="success">Health check successful: ' + data.status + '</span>');
                } else {
                    updateStatus('❌ Health check failed', 'error');
                    addResult('<span class="error">Health check failed: ' + data.error + '</span>');
                }
            } catch (error) {
                updateStatus('❌ Network error', 'error');
                addResult('<span class="error">Network error: ' + error.message + '</span>');
            }
        }
        
        async function testPingback() {
            updateStatus('Testing pingback endpoint...', 'info');
            try {
                const testData = {
                    test: true,
                    timestamp: new Date().toISOString(),
                    source: 'external_test'
                };
                
                const response = await fetch('/api/pingback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    updateStatus('✅ Pingback test successful!', 'success');
                    addResult('<span class="success">Pingback successful: ' + result.message + '</span>');
                } else {
                    updateStatus('❌ Pingback test failed', 'error');
                    addResult('<span class="error">Pingback failed: ' + result.error + '</span>');
                }
            } catch (error) {
                updateStatus('❌ Network error', 'error');
                addResult('<span class="error">Network error: ' + error.message + '</span>');
            }
        }
        
        async function testWithSampleData() {
            updateStatus('Testing with sample call data...', 'info');
            try {
                const sampleCallData = {
                    callId: "CALL_" + Date.now(),
                    callerNumber: "+91987654321",
                    calledNumber: "+91123456789",
                    callDirection: "inbound",
                    callStatus: "ringing",
                    timestamp: new Date().toISOString(),
                    sessionId: "session_" + Math.random().toString(36).substring(7),
                    duration: 0,
                    agentId: "agent_001"
                };
                
                const response = await fetch('/api/pingback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sampleCallData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    updateStatus('✅ Sample data test successful!', 'success');
                    addResult('<span class="success">Sample data processed: Call ID ' + sampleCallData.callId + '</span>');
                } else {
                    updateStatus('❌ Sample data test failed', 'error');
                    addResult('<span class="error">Sample data failed: ' + result.error + '</span>');
                }
            } catch (error) {
                updateStatus('❌ Network error', 'error');
                addResult('<span class="error">Network error: ' + error.message + '</span>');
            }
        }
        
        // Auto-run health check on page load
        window.onload = function() {
            testHealth();
        };
    </script>
</body>
</html>`;

  return new Response(testScript, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}