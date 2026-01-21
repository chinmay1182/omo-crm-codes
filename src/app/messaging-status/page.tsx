'use client';

import React, { useState, useEffect } from 'react';

export default function MessagingStatusPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getChats' })
      });

      if (response.ok) {
        const chats = await response.json();

        // Get messages for each chat
        const allMessages = [];
        for (const chat of chats) {
          const msgResponse = await fetch(`/api/messages?with=${encodeURIComponent(chat.id)}`);
          if (msgResponse.ok) {
            const chatMessages = await msgResponse.json();
            allMessages.push({
              chat: chat.id,
              messages: chatMessages
            });
          }
        }
        setMessages(allMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSend = async () => {
    const testNumber = '+917977828994';
    const testMessage = `Test message at ${new Date().toLocaleTimeString()}`;

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testNumber,
          message: testMessage,
          fromNumber: '+915422982253'
        })
      });

      const result = await response.json();

      // Refresh messages
      setTimeout(() => {
        fetchMessages();
      }, 1000);

      alert(`Send result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Send error:', error);
      alert('Send failed: ' + error);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>📱 Messaging System Status</h1>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={testSend}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#25d366',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Send Test Message
        </button>

        <button
          onClick={fetchMessages}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Messages
        </button>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>System Status:</h3>
        <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
        <p><strong>Sender Number:</strong> +915422982253</p>
        <p><strong>Total Conversations:</strong> {messages.length}</p>
        <p><strong>Total Messages:</strong> {messages.reduce((total, conv) => total + conv.messages.length, 0)}</p>
      </div>

      <h2>💬 Conversations & Messages:</h2>

      {messages.length === 0 ? (
        <p>No messages found. Try sending a test message first.</p>
      ) : (
        messages.map((conversation, index) => (
          <div key={index} style={{
            marginBottom: '2rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            <h3>📞 Chat with: {conversation.chat}</h3>
            <p><strong>Messages:</strong> {conversation.messages.length}</p>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {conversation.messages.map((msg: any, msgIndex: number) => (
                <div key={msgIndex} style={{
                  padding: '0.5rem',
                  margin: '0.5rem 0',
                  backgroundColor: msg.direction === 'OUT' ? '#e3f2fd' : '#f1f8e9',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${msg.direction === 'OUT' ? '#2196f3' : '#4caf50'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{msg.direction === 'OUT' ? '→ Sent' : '← Received'}</strong>
                    <small>{msg.time}</small>
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0' }}>{msg.content}</p>
                  {msg.status && (
                    <small style={{ color: '#666' }}>Status: {msg.status}</small>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h3>🔍 What's Happening:</h3>
        <ul>
          <li><strong>Messages are being saved to database</strong> - This is why you see them in the chat</li>
          <li><strong>MSG91 API may be failing</strong> - But messages still appear because they're stored locally</li>
          <li><strong>Recipients won't receive messages</strong> - If MSG91 API is not working</li>
          <li><strong>Chat interface works normally</strong> - Because it reads from your database</li>
        </ul>

        <p><strong>To fix:</strong> Visit <a href="/test-msg91">/test-msg91</a> to diagnose and fix the MSG91 API issues.</p>
      </div>
    </div>
  );
}