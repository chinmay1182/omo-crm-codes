// Hook for real-time WhatsApp message updates using Supabase Realtime
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export interface WhatsAppMessage {
  id: string; // mapped from message_id or generated
  from: string; // mapped from from_number
  to: string;   // mapped from to_number
  content: string;
  direction: 'IN' | 'OUT';
  time: string;
  timestamp: string;
  // Extras
  media_url?: string | null;
  media_type?: string | null;
  media_caption?: string | null;
  media_filename?: string | null;
  delivery_status?: string; // 'sent', 'delivered', 'read', 'failed'
  type?: string; // 'text', 'image', 'video', 'document', 'status'
  metadata?: any;
  latitude?: number | string;
  longitude?: number | string;
}

export function useWhatsAppMessages() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WhatsAppMessage | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    setConnectionStatus('connecting');

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newRow = payload.new as any;

          let meta = newRow.metadata;
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
          }

          // Map DB row to WhatsAppMessage interface
          const message: WhatsAppMessage = {
            id: newRow.message_id || newRow.id,
            from: newRow.from_number,
            to: newRow.to_number,
            content: newRow.content || (newRow.media_url ? '[Media]' : ''),
            direction: newRow.direction,
            time: new Date(newRow.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: newRow.created_at,
            media_url: newRow.media_url,
            media_type: newRow.media_type,
            media_caption: newRow.media_caption,
            media_filename: newRow.media_filename,
            delivery_status: newRow.status, // Assuming 'status' column in DB holds delivery status
            type: newRow.type || (newRow.media_url ? 'media' : 'text'), // Infer type if not present
            metadata: meta,
            latitude: meta?.latitude,
            longitude: meta?.longitude
          };

          setLastMessage(message);
          setMessageCount((prev) => prev + 1);

          // Browser Notification
          if (message.direction === 'IN' && 'Notification' in window && Notification.permission === 'granted') {
            // Only notify if it's an incoming message
            new Notification(`New message from ${message.from}`, {
              body: message.content.substring(0, 100),
              // You might want to add an icon here if available
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setConnectionStatus('disconnected');
    };
  }, []);

  return {
    connectionStatus,
    lastMessage,
    messageCount
  };
}
