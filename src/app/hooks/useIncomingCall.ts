// hooks/useIncomingCall.ts
import { useState, useEffect } from 'react'

export default function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    setConnectionStatus('connecting')

    const eventSource = new EventSource('/api/pingback/stream')

    eventSource.onopen = () => {
      setConnectionStatus('connected')
    }

    eventSource.onmessage = (event) => {
      try {
        // Skip keepalive messages
        if (event.data.startsWith(':')) {
          return
        }

        const data = JSON.parse(event.data)

        // Check if this is an incoming call event
        if (data.type === 'incoming_call' && data.data) {
          setIncomingCall({
            ...data.data,
            timestamp: data.timestamp,
            source: data.source
          })
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error)
      setConnectionStatus('disconnected')
    }

    // Cleanup on unmount
    return () => {
      eventSource.close()
      setConnectionStatus('disconnected')
    }
  }, [])

  const clearIncomingCall = () => {
    setIncomingCall(null)
  }

  return {
    incomingCall,
    setIncomingCall,
    clearIncomingCall,
    connectionStatus
  }
}
