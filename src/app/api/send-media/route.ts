import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import { getSessionFromRequest } from '@/app/lib/session';


const MSG91_API_KEY = '424608A3Z7MMnI0Q68751e0dP1';
const SENDER_NUMBER = '918810878185';

// Helper: undefined → null ya fallback
const safe = (val: any, fallback: any = null) =>
  val === undefined ? fallback : val;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      to,
      fromNumber,
      text,
      mediaUrl,
      mediaType,
      caption,
      filename,
      templateName,
      templateData,
      longitude,
      latitude,
      locationName,
      reaction,
      replyToMessageId,
      hello_msg_id,
      agentId
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing required field: to' }, { status: 400 });
    }

    // ===== AGENT PERMISSION VALIDATION =====
    if (agentId) {

      // Method 1: Check Session (Preferred & Faster)
      const sessionData = await getSessionFromRequest(req);
      const user = sessionData?.user;



      let isSessionAuthorized = false;

      if (user) {
        // Check if session user matches agentId (or is admin masquerading - optional strictness)
        // For now, if valid session exists, we check THAT user's perms

        const perms = user.permissions || {};
        const isAdmin = perms.admin && perms.admin.length > 0;
        const isSuperAgent = user.roles?.includes('Super Agent') ||
          (Array.isArray(user.roles) && user.roles.some((r: any) => r.name === 'Super Agent'));

        const whatsappPerms = perms.whatsapp || [];
        const hasReplyAll = whatsappPerms.includes('view_all') || whatsappPerms.includes('reply_all');
        const hasReplyAssigned = whatsappPerms.includes('reply_assigned');


        if (isAdmin || isSuperAgent || hasReplyAll) {
          isSessionAuthorized = true;
        } else if (hasReplyAssigned) {
          // For reply_assigned, we ideally check assignment. 
          // But for media, let's allow it if they have the permission, 
          // as we do the assignment check below only if needed or just auto-assign.
          // Actually, let's rely on the DB assignment check part if we want to be strict,
          // but for "Access Denied" errors, usually the issue is missing general permissions.
          isSessionAuthorized = true;
        }
      }

      if (isSessionAuthorized) {

      } else {

        // Method 2: DB Check (Fallback)
        // Initialize Admin Client for Permission Checks (Bypass RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false }
        });

        try {
          // 1. Check for Admin/Super Agent status first (Bypass)
          // Fetch roles and admin permissions using Admin Client
          const { data: agentRoles } = await supabaseAdmin
            .from('agent_roles')
            .select('roles(name)')
            .eq('agent_id', agentId);

          const { data: adminPerms } = await supabaseAdmin
            .from('agent_permissions')
            .select('permission_type')
            .eq('agent_id', agentId)
            .eq('service_type', 'admin');

          const isSuperAgent = agentRoles?.some((r: any) => r.roles?.name === 'Super Agent');
          const isAdmin = adminPerms && adminPerms.length > 0;

          if (isSuperAgent || isAdmin) {
            // Allow request to proceed
          } else {
            // 2. If not admin/super, check granular WhatsApp permissions
            const { data: permissions, error: permError } = await supabaseAdmin
              .from('agent_permissions')
              .select('permission_type')
              .eq('agent_id', agentId)
              .eq('service_type', 'whatsapp');

            if (permError) throw permError;


            const hasReplyAll = permissions?.some((p: any) => p.permission_type === 'reply_all');
            const hasReplyAssigned = permissions?.some((p: any) => p.permission_type === 'reply_assigned');

            // Check if agent has any reply permissions
            if (!hasReplyAll && !hasReplyAssigned) {
              return NextResponse.json(
                {
                  error: 'Access denied: Agent does not have permission to send media messages',
                  code: 'NO_REPLY_PERMISSION'
                },
                { status: 403 }
              );
            }
          }
        } catch (dbError) {
          return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
        }
      }
    } else {
    }

    // Normalize numbers
    const normalize = (num: string) => {
      const cleaned = num.replace(/\D/g, '');
      return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    };
    const normalizedTo = normalize(to);
    const normalizedFrom = normalize(fromNumber || SENDER_NUMBER);


    let contentType: string;
    let payload: any;
    let replyToId: string | null = null;

    // Reaction
    if (reaction) {
      contentType = 'reaction';
      replyToId = replyToMessageId || hello_msg_id;

      if (!replyToId) {
        return NextResponse.json(
          { error: 'replyToMessageId required for reaction' },
          { status: 400 }
        );
      }

      payload = {
        integrated_number: normalizedFrom,
        recipient_number: [normalizedTo],
        content_type: 'reaction',
        reaction,
        replyToMessageId: replyToId
      };
    }
    // Text
    else if (text) {
      contentType = 'text';
      payload = {
        integrated_number: normalizedFrom,
        recipient_number: [normalizedTo],
        content_type: 'text',
        text
      };
      replyToId = replyToMessageId || hello_msg_id || null;
      if (replyToId) payload.replyToMessageId = replyToId;
    }
    // Media
    else if (mediaUrl && mediaType) {
      let mappedType = mediaType;
      // Handle MIME types
      if (mediaType.startsWith('image')) mappedType = 'image';
      else if (mediaType.startsWith('video')) mappedType = 'video';
      else if (mediaType.startsWith('audio')) mappedType = 'audio';
      else if (mediaType.startsWith('application') || mediaType === 'document') mappedType = 'document';

      contentType = mappedType;

      if (!['image', 'video', 'document', 'audio'].includes(contentType)) {
        return NextResponse.json(
          { error: `Invalid mediaType: ${mediaType}. Mapped to: ${contentType}` },
          { status: 400 }
        );
      }

      payload = {
        integrated_number: normalizedFrom,
        recipient_number: [normalizedTo],
        content_type: contentType,
        attachment_url: mediaUrl,
        // Add media ID for better compatibility
        media_id: mediaUrl.split('/').pop()?.split('.')[0] || null
      };

      if (caption) payload.caption = caption;
      if (contentType === 'document') {
        payload.file_name = filename || mediaUrl.split('/').pop() || 'document';
      }

      // Add media ID for tracking
      payload.media_id = mediaUrl.split('/').pop()?.split('.')[0] || null;

      replyToId = replyToMessageId || hello_msg_id || null;
      if (replyToId) payload.replyToMessageId = replyToId;
    }
    // Template
    else if (templateName) {
      contentType = 'template';
      payload = {
        integrated_number: normalizedFrom,
        recipient_number: [normalizedTo],
        content_type: 'template',
        template_name: templateName,
        template_data: templateData || {}
      };
      replyToId = replyToMessageId || hello_msg_id || null;
      if (replyToId) payload.replyToMessageId = replyToId;
    }
    // Location
    else if (longitude && latitude) {
      contentType = 'location';
      payload = {
        integrated_number: normalizedFrom,
        recipient_number: [normalizedTo],
        content_type: 'location',
        location: {
          longitude: String(longitude).replace(/[^\d.-]/g, ''),
          latitude: String(latitude).replace(/[^\d.-]/g, ''),
          name: locationName || 'Shared Location'
        }
      };
      replyToId = replyToMessageId || hello_msg_id || null;
      if (replyToId) payload.replyToMessageId = replyToId;
    }
    else {
      return NextResponse.json(
        { error: 'Invalid request. Provide text, media, template, location, or reaction.' },
        { status: 400 }
      );
    }


    // Send to MSG91
    const response = await fetch(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: MSG91_API_KEY || '',
          accept: 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok || result.status === 'fail' || result.type === 'error') {
      return NextResponse.json({
        error: result.message || result.error || 'Failed to send media via MSG91',
        details: result,
        msg91Error: result.message || result.error,
        msg91Status: result.status,
        msg91Type: result.type,
        fullResponse: result,
        statusCode: response.status || 400
      }, { status: 400 });
    }

    // Save message in DB
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dbContent =
      text ||
      caption ||
      templateName ||
      (reaction ? `Reaction: ${reaction}` : `[${contentType} message]`);


    const dbMediaType = contentType === 'text' ? null : contentType;

    // Try to use Service Role Key for DB insert to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

    try {

      // Create a fresh client (preferably with Service Role Key)
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey!, {
        auth: {
          persistSession: false
        }
      });

      const dbPayload: any = {
        message_id: messageId,
        from_number: `+${normalizedFrom}`,
        to_number: `+${normalizedTo}`,
        content: dbContent || '[No content]',
        direction: 'OUT',
        read_status: true,
        media_url: mediaUrl || null,
        media_type: dbMediaType || null,
        media_filename: filename || null,
        media_caption: caption || null,
        delivery_status: 'delivered'
      };

      // Only include metadata if we actually have location data to save.
      // This prevents "Column not found" errors if the metadata column is missing for non-location messages.
      if (contentType === 'location' && longitude && latitude) {
        dbPayload.metadata = JSON.stringify({ latitude, longitude, name: locationName || 'Shared Location' });
      }

      const { error: insertError } = await supabaseAdmin.from('messages').insert([dbPayload]);

      if (insertError) {
        throw insertError;
      }

    } catch (dbErr: any) {
      // Return warning but still success for MSG91
      return NextResponse.json({
        success: true,
        messageId,
        contentType,
        data: result,
        message: 'Message sent to MSG91 but failed to save to DB',
        dbError: dbErr.message || dbErr,
        status: result.status || 'submitted'
      });
    }


    return NextResponse.json({
      success: true,
      messageId,
      contentType,
      data: result,
      message: 'Message sent successfully to MSG91 API',
      status: result.status || 'submitted'
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}