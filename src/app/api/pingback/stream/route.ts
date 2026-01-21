/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

// Set to hold all connected clients' controllers
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(encoder.encode(': connected\n\n'));

        // Add this controller to clients set
        clients.add(controller);

        // Heartbeat every 15 seconds (reduced from 30s for better connection health detection)
        heartbeatInterval = setInterval(() => {
          try {
            // Send keepalive comment
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch (error) {
            console.error('❌ Heartbeat failed, removing client:', error);
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            clients.delete(controller);
            try {
              controller.close();
            } catch (e) {
              // Controller already closed
            }
          }
        }, 15000); // 15 seconds

        // Cleanup when client disconnects or request aborts
        req.signal.addEventListener('abort', () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          clients.delete(controller);
          try {
            controller.close();
          } catch (e) {
            // Controller already closed
          }
        });
      } catch (error) {
        console.error('❌ Error in stream start:', error);
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        try {
          controller.close();
        } catch (e) {
          // Controller already closed
        }
      }
    },
    cancel() {
      // Stream cancelled, clean up all clients
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      clients.forEach((ctrl) => {
        try {
          ctrl.close();
        } catch (e) {
          // Controller already closed
        }
      });
      clients.clear();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      // Enable CORS if needed (configure ALLOWED_ORIGIN in environment variables)
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    },
  });
}

// Function to broadcast data to all connected clients
export function sendEventToClients(data: any) {
  const encoder = new TextEncoder();
  const sseFormatted = `data: ${JSON.stringify(data)}\n\n`;

  if (clients.size === 0) {
    return;
  }

  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode(sseFormatted));
    } catch (error) {
      clients.delete(controller);
      controller.close();
    }
  }
}
