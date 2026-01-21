import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/app/lib/apiClient';
import { useWhatsAppMessages } from './useWhatsAppMessages';

export interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    avatar: string;
    assigned_to?: string;
    assigned_agent_id?: number | null;
}

export interface Message {
    id: string;
    content: string;
    direction: "IN" | "OUT";
    time: string;
    status?: "pending" | "sent" | "delivered" | "read";
    media_url?: string | null;
    media_type?: string | null;
    media_filename?: string | null;
    media_caption?: string | null;
    timestamp?: string;
    metadata?: string | any; // For storing template buttons and other metadata
    latitude?: number | string;
    longitude?: number | string;
}

interface UseWhatsAppProps {
    agentData: {
        id: number;
        username: string;
    };
    hasAccess: boolean;
    canViewAll: boolean;
}

export function useWhatsApp({ agentData, hasAccess, canViewAll }: UseWhatsAppProps) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    // Real-time updates
    const { lastMessage, connectionStatus, messageCount } = useWhatsAppMessages();

    // Handle Real-time Messages
    useEffect(() => {
        if (lastMessage && activeChat) {
            const isForActiveChat = lastMessage.from === activeChat || lastMessage.to === activeChat;

            if (isForActiveChat && lastMessage.direction === 'IN') {
                const newMessage: Message = {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    direction: lastMessage.direction,
                    time: lastMessage.time,
                    status: undefined,
                    timestamp: lastMessage.timestamp,
                    media_url: lastMessage.media_url,
                    media_type: lastMessage.media_type,
                    media_filename: lastMessage.media_filename,
                    media_caption: lastMessage.media_caption,
                    metadata: lastMessage.metadata,
                    latitude: lastMessage.latitude,
                    longitude: lastMessage.longitude
                };

                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                });

                // Update Chat List
                setChats(prev => prev.map(c => c.id === activeChat ? {
                    ...c,
                    lastMessage: lastMessage.content,
                    time: 'Just now',
                    unread: 0
                } : c));
            } else {
                // Update other chats unread count
                setChats(prev => prev.map(c =>
                    (c.id === lastMessage.from || c.id === lastMessage.to) ? {
                        ...c,
                        lastMessage: lastMessage.content,
                        time: 'Just now',
                        unread: (c.unread || 0) + 1
                    } : c
                ));
            }
        }
    }, [lastMessage, activeChat]);

    // Fetch Chats
    const fetchChats = async () => {
        if (!hasAccess) return;

        const viewType = canViewAll ? "all" : "assigned";
        const res = await api.post<Chat[], any>('messages', {
            action: "getChats",
            agentId: agentData.id,
            viewType,
        });

        if (res.data) {
            const rawChats = res.data;
            // Enhance with contact names (keeping existing logic for now)
            // Ideally this should be server-side join, but keeping client-side for regression safety
            const enhanced = await Promise.all(rawChats.map(async (c) => {
                try {
                    // We can optimize this later
                    const r = await api.get<any>(`contacts-by-phone?phone=${encodeURIComponent(c.id)}`);
                    if (r.data?.contacts?.length) {
                        const { first_name, last_name, company_name } = r.data.contacts[0];
                        const name = `${first_name || ""} ${last_name || ""}`.trim() || company_name || c.name;
                        return { ...c, name };
                    }
                } catch (e) { }
                return c;
            }));
            setChats(enhanced);
        } else if (res.error) {
            toast.error(res.error);
        }
    };

    // Fetch Messages
    const fetchMessages = async (chatId: string) => {
        setLoading(true);
        // Normalize logic
        const normalizeChatId = (phoneNumber: string) => {
            const cleaned = phoneNumber.replace(/\D/g, '');
            return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
        };
        const normalizedId = normalizeChatId(chatId);

        // Mark messages as read
        try {
            await api.patch('messages', { contactNumber: normalizedId });
        } catch (e) {
            console.error('Failed to mark messages as read', e);
        }

        const res = await api.get<any>(`messages?with=${encodeURIComponent(normalizedId)}&agentId=${agentData.id}&limit=50`);

        if (res.data) {
            // Api now returns { data: Message[], pagination: ... }
            const data = res.data.data || res.data;
            const fetched = Array.isArray(data) ? data : [];
            const newMessages = fetched.map((msg: any) => ({
                ...msg,
                latitude: msg.metadata?.latitude,
                longitude: msg.metadata?.longitude
            }));


            setMessages(prev => {
                // Preserve pending messages to avoid them being overridden by the fetch
                const pendingMessages = prev.filter(m => m.status === 'pending');

                // Also preserve recently delivered messages (within last 30 seconds) that might be missing from fetch due to race conditions
                const now = Date.now();
                const recentlyDelivered = prev.filter(m => {
                    if (m.status !== 'delivered') return false;
                    // Check if message is recent (less than 30s old)
                    // optimistic messages have m.timestamp as ISO string from our recent fix
                    const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
                    if (!msgTime || isNaN(msgTime)) return false;

                    return (now - msgTime) < 30000; // Increased from 15s to 30s
                });

                // Filter out recently delivered messages that ARE present in newMessages (avoid duplicates)
                const missingRecent = recentlyDelivered.filter(local =>
                    !newMessages.some(server => server.id === local.id)
                );

                let combined = [...newMessages];

                // Append preserved messages
                if (missingRecent.length > 0) {
                    combined = [...combined, ...missingRecent];
                }
                if (pendingMessages.length > 0) {
                    combined = [...combined, ...pendingMessages];
                }

                // Re-sort to ensure correct order
                combined.sort((a, b) => {
                    const tA = new Date(a.timestamp || a.time).getTime();
                    const tB = new Date(b.timestamp || b.time).getTime();
                    return tA - tB;
                });

                return combined;
            });
        } else {
            toast.error(res.error || "Failed to fetch messages");
        }
        setLoading(false);
    };

    // Send Message
    const sendMessage = async (content: string, fromNumber: string) => {


        if (!activeChat || !content.trim()) {
            console.error('❌ Missing activeChat or content');
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const optimistic: Message = {
            id: tempId,
            content,
            direction: 'OUT',
            time: new Date().toLocaleTimeString(),
            timestamp: new Date().toISOString(), // Add timestamp for sorting
            status: 'pending'
        };

        setMessages(prev => [...prev, optimistic]);

        // Normalize
        const normalizeChatId = (phoneNumber: string) => {
            const cleaned = phoneNumber.replace(/\D/g, '');
            return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
        };
        const normalizedTo = normalizeChatId(activeChat);


        const payload = {
            to: normalizedTo,
            message: content,
            agentId: agentData.id,
            fromNumber
        };

        const res = await api.post<any, any>('send-message', payload);


        // ✅ Fix: Check both res.data.success and res.data.data.success
        const isSuccess = res.data?.success || res.data?.data?.success;
        const messageId = res.data?.messageId || res.data?.data?.messageId;

        if (isSuccess) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: messageId || tempId, status: 'delivered' } : m));
            // Update chat list last message
            setChats(prev => prev.map(c => c.id === activeChat ? { ...c, lastMessage: content, time: 'Just now', unread: 0 } : c));
            toast.success('Message sent!');
        } else {
            setMessages(prev => prev.filter(m => m.id !== tempId));

            // Show detailed error message
            const errorDetails = res as any;
            const detailedError = errorDetails.msg91Error || errorDetails.error || "Failed to send";
            const fullError = errorDetails.fullResponse ?
                `${detailedError}\nDetails: ${JSON.stringify(errorDetails.fullResponse, null, 2)}` :
                detailedError;

            console.error('🔴 Full MSG91 Error:', fullError);
            toast.error(detailedError);
        }
    };

    return {
        chats,
        setChats,
        activeChat,
        setActiveChat,
        messages,
        setMessages,
        fetchChats,
        fetchMessages,
        sendMessage,
        loading,
        connectionStatus,
        messageCount
    };
}
