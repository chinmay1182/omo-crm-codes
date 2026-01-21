// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const SENDER_NUMBER = process.env.SENDER_NUMBER || process.env.MSG91_PRIMARY_NUMBER || '918810878185';

const normalizeNumber = (num?: string) => {
  if (!num) return '';
  const cleaned = num.replace(/\D/g, '');
  return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
};

// Broadcast helper
async function broadcast(payload: any) {
  try {
    const { sendWhatsAppEventToClients } = await import('@/app/api/whatsapp/stream/route');
    if (typeof sendWhatsAppEventToClients === 'function') {
      sendWhatsAppEventToClients(payload);
    }
  } catch (err) {
    console.error('SSE broadcast error:', err);
  }
}

async function insertIncomingMessage(msg: any) {
  // msg shape from msg91 webhook: examples show fields like from, id, text.body, type, url, filename, caption
  const fromRaw = msg.from || msg.customerNumber || (msg.contacts && msg.contacts[0]?.wa_id) || '';
  const from = normalizeNumber(String(fromRaw));
  const to = normalizeNumber(SENDER_NUMBER);

  // Handle MSG91 JSON string quirks
  if (typeof msg.button === 'string') {
    try { msg.button = JSON.parse(msg.button); } catch (e) { }
  }
  if (typeof msg.interactive === 'string') {
    try { msg.interactive = JSON.parse(msg.interactive); } catch (e) { }
  }

  // detect content type
  // detect content type
  // detect content type
  let rawType =
    msg.type ||
    (msg.contentType ? msg.contentType : null) ||
    (msg.text ? 'text' : null) ||
    null;


  // Helper to extract text from interactive/button messages
  let interactiveBody = null;
  if (rawType === 'interactive' || rawType === 'button' || rawType === 'button_reply') {
    // Standard WhatsApp Interactive (cloud api)
    if (msg.interactive?.button_reply?.title) {
      interactiveBody = msg.interactive.button_reply.title;
    } else if (msg.interactive?.list_reply?.title) {
      interactiveBody = msg.interactive.list_reply.title;
    }
    // MSG91/Other Provider flattened structures
    else if (msg.button?.text) {
      interactiveBody = msg.button.text;
    } else if (msg.button_reply?.title) {
      interactiveBody = msg.button_reply.title;
    } else if (msg.button?.payload) {
      // sometimes payload is the text if text is missing
      interactiveBody = msg.button.payload;
    }
    // Fallback: Check if text.body exists even for button type
    else if (msg.text?.body) {
      interactiveBody = msg.text.body;
    }
  }

  // If we extracted text from an interactive/button message, treat it as text so it displays correctly
  if (interactiveBody) {
    rawType = 'text';
  }

  const mediaType =
    rawType === 'image' || rawType === 'video' || rawType === 'document' || rawType === 'audio'
      ? rawType
      : rawType === 'text'
        ? 'text'
        : rawType || 'unknown';

  const textBody = interactiveBody || (msg.text && (msg.text.body || msg.text)) || msg.text?.body || msg.caption || msg.message || null;
  const content = mediaType === 'text' ? textBody || '' : `[${mediaType} message]`;
  const messageId = msg.id || msg.uuid || uuidv4();
  const mediaUrl = msg.url || msg.media_url || null;
  const mediaFilename = msg.filename || msg.media_filename || null;
  const mediaCaption = msg.caption || null;

  // Skip duplicate template header images sent by MSG91
  // These are already embedded in the template message
  if (mediaType === 'image' && mediaFilename && mediaFilename.includes('template_header')) {
    return; // Don't insert this as a separate message
  }

  try {


    const { error: insertError } = await supabase
      .from('messages')
      .insert([{
        message_id: messageId,
        from_number: from,
        to_number: to,
        content,
        direction: 'IN',
        read_status: false,
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
        media_caption: mediaCaption,
        delivery_status: 'delivered'
      }]);

    if (insertError) {
      console.error('❌ DB Insert Error:', insertError);
      throw insertError;
    }


    // Auto-assign incoming chat to available agents
    try {

      // Check if chat is already assigned
      const { data: existingAssignment } = await supabase
        .from('chat_assignments')
        .select('agent_id')
        .eq('chat_id', from)
        .single(); // Use single() if expecting one, but array check is safer logic-wise if multiples possible (though schema unique not there yet, logic assumes one) 
      // If multiple, single() throws. Let's use maybeSingle or fetch list.
      // Using simple select.

      if (!existingAssignment) {
        // Find available agents with reply_assigned or reply_all permissions
        // Joining agents and agent_permissions
        // This query: SELECT ... FROM agents a JOIN agent_permissions ap ... WHERE ap.service_type='whatsapp' AND ...
        // Supabase:
        const { data: availableAgents } = await supabase
          .from('agents')
          .select(`
                id, 
                username,
                agent_permissions!inner (
                    permission_type,
                    service_type
                )
            `)
          .eq('status', 'active')
          .eq('agent_permissions.service_type', 'whatsapp')
          .or('permission_type.eq.reply_all,permission_type.eq.reply_assigned', { foreignTable: 'agent_permissions' })
          .limit(1);


        const { data: permissions } = await supabase
          .from('agent_permissions')
          .select(`
                agent_id,
                agents!inner (
                    id,
                    username,
                    status
                )
            `)
          .eq('service_type', 'whatsapp')
          .in('permission_type', ['reply_all', 'reply_assigned'])
          .eq('agents.status', 'active')
          .limit(1);


        if (permissions && permissions.length > 0) {
          const assignedAgent = (permissions[0] as any).agents; // agent details from nested
          const agentId = assignedAgent.id;



          await supabase
            .from('chat_assignments')
            .insert([{
              chat_id: from,
              agent_id: agentId
            }]);


        } else {

        }
      } else {

      }
    } catch (assignError) {
      console.error('❌ Auto-assignment error (non-critical):', assignError);
      // Don't throw error - this is not critical for message processing
    }

    // SSE broadcast incoming message
    await broadcast({
      type: 'new_message',
      message: {
        id: messageId,
        from,
        to,
        content,
        direction: 'IN',
        timestamp: new Date().toISOString(),
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
        media_caption: mediaCaption,
        delivery_status: 'delivered'
      }
    });
  } catch (err) {
    console.error('Insert incoming message error:', err);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();


    // Log webhook payload (optional)
    try {
      await supabase
        .from('webhook_logs')
        .insert([{
          webhook_type: 'msg91_whatsapp',
          payload: data
        }]);
    } catch (logErr) {
      console.error('Webhook log failed:', logErr);
    }

    // Some providers send delivery status objects (no messages array) - handle delivery/update
    // Look for fields: status, uuid/messageId
    if ((data.status || data.eventName === 'delivered' || data.eventName === 'read') && (data.uuid || data.messageId || data.requestId)) {
      const msgId = data.uuid || data.messageId || data.requestId;
      const status = data.status || data.eventName || 'delivered';
      // Update DB safely
      try {
        await supabase
          .from('messages')
          .update({
            delivery_status: status,
            delivery_timestamp: new Date().toISOString()
          })
          .eq('message_id', msgId);

        // Broadcast delivery update via SSE
        await broadcast({
          type: 'delivery_update',
          message: {
            message_id: msgId,
            delivery_status: status,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        console.error('Delivery update DB error:', err);
      }

      return NextResponse.json({ success: true, message: 'Delivery processed' });
    }

    // If provider sends messages array (incoming messages)
    // Handle stringified messages from MSG91
    if (typeof data.messages === 'string') {
      try { data.messages = JSON.parse(data.messages); } catch (e) {
        console.error('Failed to parse messages string:', e);
      }
    }

    if (data.messages && Array.isArray(data.messages)) {
      for (const m of data.messages) {
        // msg91 sometimes nests type/text differently; forward whole object
        await insertIncomingMessage(m);
      }
      return NextResponse.json({ success: true, message: 'Messages processed' });
    }

    // Some msg91 payload top-level contains customerNumber + contentType + text etc (not inside messages)
    if ((data.customerNumber || data.from) && data.contentType) {
      await insertIncomingMessage(data);
      return NextResponse.json({ success: true, message: 'Single message processed' });
    }

    return NextResponse.json({ success: false, message: 'No actionable payload' });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return NextResponse.json({ error: 'Failed to process webhook', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: 'Webhook endpoint active', timestamp: new Date().toISOString(), endpoint: '/api/whatsapp/webhook' });
}
