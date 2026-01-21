import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { PERMISSIONS } from '@/app/lib/constants/permissions';
import { getSessionFromRequest } from '@/app/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const with_number = searchParams.get('with');
    const agentId = searchParams.get('agentId');


    if (!with_number) {
      return NextResponse.json({ error: 'Missing with parameter' }, { status: 400 });
    }

    // Verify session and permissions
    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionUserId, type: userType, permissions: sessionPermissions } = session.user;

    // Ensure the requester is the agent they claim to be (unless they are admin viewing as another agent? No, usually not via query param like this)
    // If agentId is passed, it should match session or session should be admin.
    if (agentId && String(sessionUserId) !== String(agentId)) {
      // Only allow if session user is admin?
      const isAdminCallback = sessionPermissions?.admin?.includes('view_all') || sessionPermissions?.admin?.includes('manage_agents'); // simplistic check
      if (!isAdminCallback) {
        return NextResponse.json({ error: 'Unauthorized: Agent ID mismatch' }, { status: 403 });
      }
    }

    // Use session permissions (which are already merged from roles + individual)
    const whatsappPerms = sessionPermissions?.whatsapp || [];
    const hasViewAll = whatsappPerms.includes('view_all') || whatsappPerms.includes('view_all_chats');
    const hasViewAssigned = whatsappPerms.includes('view_assigned') || whatsappPerms.includes('view_assigned_only');

    if (!hasViewAll && !hasViewAssigned) {
      // Check if they are Super Agent or Admin via permissions
      // (Usually access to whatsapp module implies some capability, but let's be strict)
      // If "whatsapp" key is missing, maybe they are admin?
      const isAdmin = sessionPermissions?.admin && sessionPermissions.admin.length > 0;
      if (!isAdmin) {
        return NextResponse.json({ error: 'Access denied - no view permissions' }, { status: 403 });
      }
    }

    // Check assignment if restricted
    if (!hasViewAll && hasViewAssigned && agentId) {
      // ... (Keep existing assignment check logic using DB as assignment is dynamic)
      const normalizeChatId = (phoneNumber: string) => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
      };

      const normalizedChatId = normalizeChatId(with_number);

      const { data: chatAssignment } = await supabase
        .from('chat_assignments')
        .select('agent_id')
        .eq('chat_id', normalizedChatId)
        .eq('agent_id', agentId);

      if (!chatAssignment || chatAssignment.length === 0) {
        return NextResponse.json({ error: 'Access denied - chat not assigned to you' }, { status: 403 });
      }
    }

    // Normalize phone numbers to handle different formats
    const normalizeNumber = (num: string) => {
      if (!num) return '';
      // Remove all non-digits and add +91 prefix if not present
      const cleaned = num.replace(/\D/g, '');
      if (cleaned.startsWith('91')) {
        return `+${cleaned}`;
      }
      return `+91${cleaned}`;
    };

    const senderNumber = process.env.SENDER_NUMBER || '+918810878185';
    const normalizedSender = normalizeNumber(senderNumber);
    const normalizedWith = normalizeNumber(with_number);

    // Get messages between your WhatsApp number and the contact using flexible matching
    const senderNumberDigits = normalizedSender.replace(/\D/g, '').slice(-10); // Get last 10 digits
    const withNumberDigits = normalizedWith.replace(/\D/g, '').slice(-10); // Get last 10 digits

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`from_number.ilike.%${senderNumberDigits}%,to_number.ilike.%${senderNumberDigits}%`)
      .or(`from_number.ilike.%${withNumberDigits}%,to_number.ilike.%${withNumberDigits}%`)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Fetch messages involving the contact number (either as sender or receiver)
    // This allows seeing the full conversation regardless of which agent/number was used on the company side.
    const { data: messagesCorrected, error: correctedError, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .or(`from_number.ilike.%${withNumberDigits}%,to_number.ilike.%${withNumberDigits}%`)
      .order('created_at', { ascending: false }) // Newest first
      .range(offset, offset + limit - 1);

    if (correctedError) throw correctedError;

    // Transform database results to match your frontend format
    const formattedMessages = (messagesCorrected || []).map((msg: any) => {
      // For media messages, use caption or filename as content if available
      let displayContent = msg.content;
      if (msg.media_url && (msg.content === '[Media message]' || msg.content === '🖼️ Image')) {
        if (msg.media_caption) {
          displayContent = msg.media_caption;
        } else if (msg.media_filename) {
          displayContent = msg.media_filename;
        } else {
          // Set appropriate content based on media type
          switch (msg.media_type) {
            case 'image':
              displayContent = '📸 Image';
              break;
            case 'video':
              displayContent = '🎥 Video';
              break;
            case 'audio':
              displayContent = '🎵 Audio';
              break;
            default:
              displayContent = '📎 Document';
          }
        }
      }

      let parsedMetadata = null;
      try {
        parsedMetadata = msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : null;
      } catch (e) {
        // console.error('Metadata parse error', e);
      }
      let inferredMediaType = msg.media_type;

      // Fallback inference: Even if type is 'text' (incorrectly saved), check content/metadata patterns.
      const isMissingOrText = !inferredMediaType || inferredMediaType === 'text';

      // Fallback inference for Location
      if (isMissingOrText && parsedMetadata?.latitude && parsedMetadata?.longitude) {
        inferredMediaType = 'location';
      }

      // Fallback inference for Reaction
      if (isMissingOrText && msg.content && msg.content.startsWith('Reaction:')) {
        inferredMediaType = 'reaction';
      }

      // Fallback inference for Template
      if (isMissingOrText && (msg.content && (msg.content.includes('<!--BUTTONS:') || displayContent.includes('Team ConsoLegal')))) {
        inferredMediaType = 'template';
      }

      return {
        id: msg.message_id,
        content: displayContent,
        direction: msg.direction,
        time: new Date(msg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: msg.direction === 'OUT' ? 'read' : undefined,
        media_url: msg.media_url,
        media_type: inferredMediaType,
        media_filename: msg.media_filename,
        media_caption: msg.media_caption,
        timestamp: msg.created_at,
        metadata: parsedMetadata
      };
    });

    // Reverse to show oldest first in UI
    const reversedMessages = formattedMessages.reverse();

    // Log template messages for debugging
    const templateMessages = reversedMessages.filter((m: any) => m.media_type === 'template');
    if (templateMessages.length > 0) {
      console.log(`📋 Found ${templateMessages.length} template messages:`,
        templateMessages.map((m: any) => ({
          id: m.id,
          hasMediaUrl: !!m.media_url,
          mediaUrl: m.media_url
        }))
      );
    }

    return NextResponse.json({
      data: reversedMessages,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error: any) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }
}

// POST endpoint to fetch all chats/contacts
export async function POST(req: NextRequest) {
  try {
    const { action, agentId, viewType } = await req.json();

    if (action === 'getChats') {
      const senderNumber = process.env.SENDER_NUMBER || '+918810878185';
      const senderDigits = senderNumber.replace(/\D/g, '').slice(-10);

      // Fetch all messages involving the sender
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`from_number.ilike.%${senderDigits}%,to_number.ilike.%${senderDigits}%`)
        .order('created_at', { ascending: false }); // Newest first

      if (error) throw error;

      // Group by contact and find latest message
      // Note: This is an in-memory aggregation. Supabase/PostgREST doesn't support complex GROUP BY/Max logic on raw generic queries easily without RPC.
      // Given chat volume might be high, ideally we'd use an RPC function or a View. 
      // But for now, let's do in-memory (assuming < 10k messages for now, or just reasonable performance).

      const chatsMap = new Map();

      (allMessages || []).forEach(msg => {
        const isFromMe = msg.from_number.includes(senderDigits);
        const contactNum = isFromMe ? msg.to_number : msg.from_number;

        if (!chatsMap.has(contactNum)) {
          chatsMap.set(contactNum, {
            contact_number: contactNum,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0
          });
        }

        const chat = chatsMap.get(contactNum);
        if (msg.direction === 'IN' && !msg.read_status) {
          chat.unread_count++;
        }
      });

      const chats = Array.from(chatsMap.values());

      // Helper to normalize to +91########## to match assignments
      const normalizeToPlus91 = (num: string) => {
        if (!num) return '';
        const digits = String(num).replace(/\D/g, '');
        if (!digits) return '';
        return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
      };

      // Build a set of normalized contact numbers
      const normalizedContacts: string[] = chats.map((c) => normalizeToPlus91(c.contact_number));

      // Fetch assignments for these chats in one query
      let assignmentsByChat: Record<string, { agent_id: number; username: string | null }> = {};

      if (normalizedContacts.length > 0) {
        const { data: assignments } = await supabase
          .from('chat_assignments')
          .select('chat_id, agent_id, agents(username)')
          .in('chat_id', normalizedContacts);

        (assignments || []).forEach((row: any) => {
          assignmentsByChat[row.chat_id] = {
            agent_id: row.agent_id,
            username: row.agents?.username || null
          };
        });
      }

      // Optionally filter to only assigned chats for this agent
      const filterAssignedOnly = String(viewType).toLowerCase() === 'assigned' && !!agentId;

      // Generate simple profile icon
      const generateProfileIcon = (name: string) => {
        const colors = [
          '#25d366', '#128c7e', '#34b7f1', '#7c4dff',
          '#ff5722', '#ff9800', '#4caf50', '#2196f3',
          '#9c27b0', '#f44336', '#607d8b', '#795548'
        ];

        const initials = name.replace(/\D/g, '').slice(-2) || name.slice(0, 2).toUpperCase();
        const colorIndex = name.length % colors.length;
        const backgroundColor = colors[colorIndex];

        const svg = `
          <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="25" fill="${backgroundColor}"/>
            <text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
              ${initials}
            </text>
          </svg>
        `;

        return `data:image/svg+xml;base64,${btoa(svg)}`;
      };

      // Map chats and attach assignment details
      let formattedChats = chats.map((chat: any) => {
        const normalizedId = normalizeToPlus91(chat.contact_number);
        const assignment = assignmentsByChat[normalizedId];
        return {
          id: chat.contact_number,
          name: chat.contact_number,
          lastMessage: chat.last_message || 'No messages',
          time: new Date(chat.last_message_time).toLocaleString(),
          unread: chat.unread_count || 0,
          avatar: generateProfileIcon(chat.contact_number),
          assigned_to: assignment?.username || null,
          assigned_agent_id: assignment?.agent_id || null,
        };
      });

      if (filterAssignedOnly) {
        formattedChats = formattedChats.filter(
          (c: any) => Number(c.assigned_agent_id) === Number(agentId)
        );
      }

      return NextResponse.json(formattedChats);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Chats fetch error:', error);
    return NextResponse.json({
      error: 'Database error',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { contactNumber } = await req.json();

    if (!contactNumber) {
      return NextResponse.json({ error: 'Missing contactNumber' }, { status: 400 });
    }

    // Normalize number
    const normalizeNumber = (num: string) => {
      const cleaned = num.replace(/\D/g, '');
      return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
    };

    // We match by digits to be safe (last 10)
    const digits = contactNumber.replace(/\D/g, '').slice(-10);

    const { error } = await supabase
      .from('messages')
      .update({ read_status: true })
      .eq('direction', 'IN')
      .ilike('from_number', `%${digits}%`)
      .eq('read_status', false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}