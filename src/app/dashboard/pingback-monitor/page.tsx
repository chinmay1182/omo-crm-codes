'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

interface PingbackEvent {
  id: string;
  timestamp: string;
  type: string;
  data: any;
  source: string;
}

export default function PingbackMonitor() {
  const [events, setEvents] = useState<PingbackEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    setConnectionStatus('connecting');

    const eventSource = new EventSource('/api/pingback/stream');

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        // Skip keepalive messages
        if (event.data.startsWith(':')) {
          return;
        }

        const data = JSON.parse(event.data);

        const newEvent: PingbackEvent = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type || 'unknown',
          data: data.data || data,
          source: data.source || 'unknown'
        };

        setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
      } catch (error) {
      }
    };

    eventSource.onerror = (error) => {
      setConnectionStatus('disconnected');
    };

    return () => {
      eventSource.close();
      setConnectionStatus('disconnected');
    };
  }, []);

  const sendTestPingback = async () => {
    try {
      setTestResult('Sending test pingback...');
      const response = await fetch('/api/test-pingback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult('✅ Test pingback sent successfully!');
      } else {
        setTestResult(`❌ Test failed: ${result.message || result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Clear test result after 5 seconds
    setTimeout(() => setTestResult(''), 5000);
  };

  const testConnectivity = async () => {
    try {
      setTestResult('Testing connectivity...');

      // Test the health endpoint
      const healthResponse = await fetch('/api/pingback-health');
      const healthData = await healthResponse.json();

      if (healthResponse.ok && healthData.status === 'healthy') {
        setTestResult('✅ Connectivity test passed! Pingback endpoint is accessible.');
      } else {
        setTestResult('❌ Connectivity test failed. Check server status.');
      }
    } catch (error) {
      setTestResult(`❌ Connectivity test failed: ${error instanceof Error ? error.message : 'Network error'}`);
    }

    // Clear test result after 5 seconds
    setTimeout(() => setTestResult(''), 5000);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#28a745';
      case 'connecting': return '#ffc107';
      case 'disconnected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pingback Monitor</h1>
        <div className={styles.status}>
          <div
            className={styles.statusIndicator}
            style={{ backgroundColor: getStatusColor() }}
          ></div>
          <span>Status: {connectionStatus}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={testConnectivity} className={styles.connectivityButton}>
          Test Connectivity
        </button>
        <button onClick={sendTestPingback} className={styles.testButton}>
          Send Test Pingback
        </button>
        <button onClick={clearEvents} className={styles.clearButton}>
          Clear Events
        </button>
        {testResult && (
          <div className={styles.testResult}>
            {testResult}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3>Pingback URL Configuration</h3>
        <div className={styles.urlInfo}>
          <strong>Your Pingback URL:</strong>
          <code>https://crm.consolegal.com/api/pingback</code>
        </div>
        <p>✅ This URL should be whitelisted and configured in your Vodafone Vi MyCTS dashboard.</p>
        <div className={styles.urlDetails}>
          <h4>Configuration Details:</h4>
          <ul>
            <li><strong>Method:</strong> POST</li>
            <li><strong>Content-Type:</strong> application/json</li>
            <li><strong>HTTPS:</strong> Required (SSL enabled)</li>
            <li><strong>Response:</strong> 200 OK with JSON confirmation</li>
          </ul>
        </div>
      </div>

      <div className={styles.eventsSection}>
        <h3>Recent Events ({events.length})</h3>
        {events.length === 0 ? (
          <div className={styles.noEvents}>
            No events received yet. Send a test pingback or wait for real calls.
          </div>
        ) : (
          <div className={styles.eventsList}>
            {events.map((event) => (
              <div key={event.id} className={styles.event}>
                <div className={styles.eventHeader}>
                  <span className={styles.eventType}>{event.type}</span>
                  <span className={styles.eventSource}>{event.source}</span>
                  <span className={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.eventData}>
                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}