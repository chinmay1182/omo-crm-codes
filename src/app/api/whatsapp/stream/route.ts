// SSE endpoint for real-time WhatsApp message updates
import { NextRequest } from 'next/server';

// Store active SSE connections
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send initial comment to keep connection alive in SSE
        controller.enqueue(encoder.encode(': connected\n\n'));

        // Add this controller to our clients set
        clients.add(controller);

        // Send initial connection confirmation
        const initialData = {
          type: 'connection',
          status: 'connected',
          timestamp: new Date().toISOString()
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      } catch (error) {
        console.error('Error setting up WhatsApp SSE connection:', error);
        controller.close();
      }
    },

    cancel() {
      // Remove this controller from our clients set
      clients.delete(this as any);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Function to broadcast WhatsApp message events to all connected clients
export function sendWhatsAppEventToClients(data: any) {
  const encoder = new TextEncoder();
  const sseFormatted = `data: ${JSON.stringify(data)}\n\n`;

  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode(sseFormatted));
    } catch (error) {
      console.error('Error sending WhatsApp event to client:', error);
      // Remove failed connections
      clients.delete(controller);
    }
  }

}