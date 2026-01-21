"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useWhatsApp } from "@/app/hooks/useWhatsApp";


import InstantReply from "@/app/components/InstantReply/InstantReply";
import ChatContextMenu from "./ChatContextMenu";
import ContactModal from "@/app/components/Contact/ContactModal";
import NewChatModal from "./NewChatModal";
import styles from "../styles.module.css";
import { useRouter } from "next/navigation";
import Spinner from "@/app/components/Spinner/Spinner";
import { PERMISSIONS } from "@/app/lib/constants/permissions";
import TemplateModal from "@/app/components/Template/TemplateModal";
import InteractiveListModal from "@/app/components/ui/InteractiveListModal";
import MediaUpload from "@/app/components/Media/MediaUpload";
import TemplateSettings from "@/app/components/Template/TemplateSettings";

/* ---------- TYPES --------------------------------------------------------- */
interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  assigned_to?: string;
}

interface Message {
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

interface AgentPermission {
  permission_type: string;
  permission_value: any;
}

interface AgentWhatsAppProps {
  agentData: {
    id: number;
    username: string;
    full_name?: string;
    permissions?: any;
    roles?: string[];
  };
}

/* ---------- COMPONENT ----------------------------------------------------- */
export default function AgentWhatsApp({ agentData }: AgentWhatsAppProps) {
  const router = useRouter();

  /* ---- state ---- */
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // const [loading, setLoading] = useState(false); // Managed by hook
  const [transferAgent, setTransferAgent] = useState("");
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [showInteractiveModal, setShowInteractiveModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [agentPermissions, setAgentPermissions] = useState<AgentPermission[]>(
    []
  );

  /* ---------- permissions ---------- */
  const can = (type: string) =>
    agentPermissions.some((p) => p.permission_type === type);

  const canViewAll = () => can(PERMISSIONS.WHATSAPP.LEGACY.VIEW_ALL) || can(PERMISSIONS.WHATSAPP.VIEW_ALL);
  const canViewAssigned = () =>
    can(PERMISSIONS.WHATSAPP.LEGACY.VIEW_ASSIGNED) || can(PERMISSIONS.WHATSAPP.VIEW_ASSIGNED);
  const canReplyAll = () => can("reply_all") || can(PERMISSIONS.WHATSAPP.REPLY_ALL);
  const canReplyAssigned = () =>
    can("reply_assigned") || can(PERMISSIONS.WHATSAPP.REPLY_ASSIGNED);
  const canTransfer = () => can(PERMISSIONS.WHATSAPP.TRANSFER_CHATS) || can("transfer") || can("transfer_chats");

  /* ---------- HOOK ---------- */
  // Use the new custom hook for main logic
  const {
    chats,
    setChats, // Exposed if needed for manual updates
    activeChat,
    setActiveChat,
    messages,
    setMessages, // Now exposed from hook
    fetchChats,
    fetchMessages, // Use direct name
    sendMessage: hookSendMessage,
    loading,
    connectionStatus,
    messageCount
  } = useWhatsApp({
    agentData: { id: agentData.id, username: agentData.username },
    hasAccess: !!hasAccess,
    canViewAll: canViewAll()
  });

  /* WhatsApp numbers */
  const [availableWhatsAppNumbers, setAvailableWhatsAppNumbers] = useState<any[]>([]);
  const [selectedWhatsAppNumber, setSelectedWhatsAppNumber] = useState("");

  /* media modal */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /* instant reply */
  const [showInstantReply, setShowInstantReply] = useState(false);

  /* contact modal */
  const [showContactModal, setShowContactModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactExists, setContactExists] = useState<boolean | null>(null);

  /* refs */
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current)
        listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* context menu (transfer) */
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    chatId: string | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, chatId: null });

  /* reactions */
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<string | null>(null);

  const handleReactionClick = (messageId: string) => {
    setSelectedMessageForReaction(messageId);
    setShowMediaUpload(true);
  };

  /* ---------- life-cycle ---------- */
  useEffect(() => {
    const initializeAgent = async () => {
      await checkAgentAccess();
      await setupAvailableWhatsAppNumbers();
    };

    if (agentData) {
      initializeAgent();
    }
  }, [agentData]);

  // Hook handles chat Fetching when access changes, but we trigger it here if needed
  useEffect(() => {
    if (hasAccess) {
      fetchChats();
      if (canTransfer()) fetchAvailableAgents();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat); // Use hook method directly

      // Check contact logic...
      const chat = chats.find((c) => c.id === activeChat);
      if (chat?.id) {
        checkContactExists(chat.id).then(exists => {
          setContactExists(exists);
        });
      } else {
        setContactExists(null);
      }
    }
  }, [activeChat]);

  // Determine agent type logic...
  const getAgentType = () => {
    const roleNames = agentData.roles || [];
    if (roleNames.includes('Super Agent')) return "super";
    if (roleNames.includes('Senior Agent')) return "senior";
    if (roleNames.includes('Regular Agent')) return "regular";
    if (roleNames.includes('View Only Agent')) return "view-only";
    if (can("reply_all") || can("reply_assigned")) return "regular";
    if (can("view_all") || can("view_assigned")) return "view-only";
    return "basic";
  };

  const isViewOnlyAgent = () => getAgentType() === "view-only";
  const isRegularAgent = () => getAgentType() === "regular";
  const isSeniorAgent = () => getAgentType() === "senior";
  const isSuperAgent = () => getAgentType() === "super";

  /* ---------- access ---------- */
  const checkAgentAccess = async () => {
    // Check for Admin permissions or Super Agent role
    const isAdmin = agentData.permissions?.admin && Array.isArray(agentData.permissions.admin) && agentData.permissions.admin.length > 0;
    const isSuperAgent = agentData.roles?.includes('Super Agent');

    if (isAdmin || isSuperAgent) {
      // Grant full access
      const allPermissions = [
        PERMISSIONS.WHATSAPP.VIEW_ALL,
        PERMISSIONS.WHATSAPP.REPLY_ALL,
        PERMISSIONS.WHATSAPP.TRANSFER_CHATS,
        "view_all_chats", "reply_all_chats", "transfer_chats" // Ensure legacy/string matches work
      ].map(p => ({ permission_type: p, permission_value: true }));

      setAgentPermissions(allPermissions);
      setHasAccess(true);
      return;
    }

    if (agentData.permissions && agentData.permissions.whatsapp && Array.isArray(agentData.permissions.whatsapp)) {
      const mappedPermissions = agentData.permissions.whatsapp.map((perm: string) => ({
        permission_type: perm,
        permission_value: true
      }));
      setAgentPermissions(mappedPermissions);
      setHasAccess(true);
      return;
    }
    // Fallback API...
    try {
      const refreshRes = await fetch('/api/agent-auth/refresh-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId: agentData.id })
      });
      // also check if they are admin via API if needed, but local check should suffice if data is fresh
      const res = await fetch(`/api/agent-permissions?agentId=${agentData.id}&serviceType=whatsapp`);
      if (res.ok) {
        const json = await res.json();
        setHasAccess(json.hasAccess);
        setAgentPermissions(json.permissions || []);
      } else {
        setHasAccess(true); // Default to true if API fails? Or false? kept as per original logic logic seem allow? Original logic: 
        // Original logic was: else { setHasAccess(true); ... } which seems weirdly permissive for fallback error. 
        // I will keep it but it looks suspicious.
        setAgentPermissions([]);
      }
    } catch {
      // Original: setHasAccess(true); 
      setHasAccess(true);
      setAgentPermissions([]);
    }
  };

  /* ---------- WhatsApp numbers ---------- */
  const setupAvailableWhatsAppNumbers = async () => {
    // (Keep existing logic)
    try {
      const response = await fetch("/api/whatsapp-numbers");
      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      const whatsappNumbers = data.filter((num: any) => num.is_active);
      setAvailableWhatsAppNumbers(whatsappNumbers);
      if (whatsappNumbers.length > 0) {
        const def = whatsappNumbers.find((n: any) => n.is_default);
        if (def) setSelectedWhatsAppNumber(def.number);
        else setSelectedWhatsAppNumber(whatsappNumbers[0].number);
      }
    } catch (e) {
      // Fallback to env vars if API fails
      const primary = process.env.NEXT_PUBLIC_MSG91_PRIMARY_NUMBER || '918810878185';
      const nums = [{
        id: 1,
        number: primary,
        display_name: "Primary WhatsApp",
        formatted: `+${primary}`,
        is_default: true,
        is_active: true
      }];
      setAvailableWhatsAppNumbers(nums);
      setSelectedWhatsAppNumber(primary);
    }
  };



  // fetchAvailableAgents...
  const fetchAvailableAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const json = await res.json();
      setAvailableAgents(json.agents.filter((a: any) => a.id !== agentData.id && a.status === "active"));
    } catch (e) { console.error(e); }
  };

  /* ---------- messaging ---------- */
  const sendMessage = async () => {


    if (!selectedWhatsAppNumber) {
      console.error('❌ No WhatsApp number selected');
      toast.error("Select WhatsApp number");
      return;
    }

    if (!input.trim()) {
      console.error('❌ Empty message');
      toast.error("Please enter a message");
      return;
    }

    const currentChat = chats.find((c) => c.id === activeChat);

    // Check if user is admin or super agent (bypass permission check)
    const isAdmin = agentData.permissions?.admin && Array.isArray(agentData.permissions.admin) && agentData.permissions.admin.length > 0;
    const isSuperAgent = agentData.roles?.includes('Super Agent');


    // Admin and Super Agent can always send messages
    const canReply = isAdmin || isSuperAgent || canReplyAll() || (canReplyAssigned() && currentChat?.assigned_to === agentData.username);

    if (!canReply) {
      console.error('❌ Permission denied');
      toast.error("You do not have permission to reply to this chat");
      return;
    }

    // Use hook
    await hookSendMessage(input, selectedWhatsAppNumber);
    setInput("");
  };

  /* Removed old fetchChats, fetchMessages since they are in hook */

  const sendInteractiveList = async (payload: any) => {
    try {
      const res = await fetch("/api/send-interactive-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Interactive list sent!");
        fetchChats();
        fetchMessages(activeChat!);
      } else toast.error("Failed to send interactive list");
    } catch (e) {
      toast.error("Error sending interactive list");
    }
  };

  const sendTemplate = async (payload: any) => {
    try {
      // ✅ Add optimistic message for template
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: Message = {
        id: tempId,
        content: payload.templateBody || `Template: ${payload.templateName}`,
        direction: "OUT",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        status: "delivered",
        media_type: 'template',
        media_url: payload.headerImage || null,
      };

      // Add optimistic message to UI immediately
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();

      // Optimistic Chat List Update
      setChats(prev => prev.map(c => c.id === activeChat ? {
        ...c,
        lastMessage: payload.templateBody || `Template: ${payload.templateName}`,
        time: 'Just now',
        unread: 0
      } : c));

      const res = await fetch("/api/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        // Update optimistic message with real ID
        if (data.message_uuid) {
          setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, id: data.message_uuid } : m));
        }
        toast.success("Template sent!");
        // Fetch in background to sync
        fetchChats();
        fetchMessages(activeChat!);
      } else {
        const err = await res.json();
        toast.error(err.details?.message || "Failed to send template");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== tempId));
        fetchChats();
      }
    } catch (e) {
      toast.error("Error sending template");
      fetchChats();
    }
  };

  const sendMedia = async (payload: any) => {
    if (!activeChat) return;

    // Ensure we have all necessary fields
    const finalPayload = {
      ...payload,
      to: activeChat,
      fromNumber: selectedWhatsAppNumber,
      agentId: agentData.id
    };

    // ✅ Add optimistic UI update for media messages
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: Message = {
      id: tempId,
      // Priority: text (for emojis sent as text) > reaction > caption > default fallback
      content: payload.text || payload.reaction || payload.caption || `[${payload.mediaType} message]`,
      direction: "OUT",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      status: "delivered", // Start with delivered (double tick) immediately
      media_url: payload.mediaUrl,
      media_type: payload.mediaType,
      media_filename: payload.filename || null,
      media_caption: payload.caption || null,
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch("/api/send-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (res.ok) {
        const data = await res.json();

        // Update optimistic message with real ID to prevent duplicates
        if (data.messageId) {
          setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, id: data.messageId } : m));
        }

        toast.success("Media sent!");
        // Update chat list
        fetchChats();
        // Refresh messages to get the real message with proper ID
        fetchMessages(activeChat);
      } else {
        const err = await res.json();
        toast.error(err.details?.message || "Failed to send media");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== tempId));
      }
    } catch (e) {
      toast.error("Error sending media");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  /* ---------- transfer ---------- */
  const transferChat = async () => {
    if (!transferAgent || !activeChat) {
      toast.error("Please select an agent to transfer to");
      return;
    }
    if (!canTransfer()) {
      toast.error("You don't have permission to transfer chats");
      return;
    }
    try {
      const res = await fetch("/api/transfer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChat,
          fromAgentId: agentData.id,
          toAgentId: transferAgent,
        }),
      });
      if (res.ok) {
        toast.success("Chat transferred successfully");
        setTransferAgent("");
        fetchChats();
      } else toast.error("Failed to transfer chat");
    } catch (e) {
      toast.error("Error transferring chat");
    }
  };

  /* ---------- helpers ---------- */
  const isPhoneNumber = (t: string) => {
    const c = t.replace(/\D/g, "");
    return c.length >= 8 && c.length <= 15;
  };
  const formatPhoneNumber = (t: string) => {
    const c = t.replace(/\D/g, "");
    if (c.length === 10 && !c.startsWith("91")) return `+91${c}`;
    if (c.length >= 10 && !t.startsWith("+")) return `+${c}`;
    return t.startsWith("+") ? t : `+${c}`;
  };
  const generateProfileIcon = (name: string) => {
    const colors = [
      "#25d366",
      "#128c7e",
      "#34b7f1",
      "#7c4dff",
      "#ff5722",
      "#ff9800",
      "#4caf50",
      "#2196f3",
      "#9c27b0",
      "#f44336",
      "#607d8b",
      "#795548",
    ];
    const initials =
      name.replace(/\D/g, "").slice(-2) || name.slice(0, 2).toUpperCase();
    const bg = colors[name.length % colors.length];
    const svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="25" fill="${bg}"/><text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  const createNewChat = (phone: string) => {
    const num = formatPhoneNumber(phone);
    const neo: Chat = {
      id: num,
      name: num,
      lastMessage: "Start a new conversation",
      time: "Now",
      unread: 0,
      avatar: generateProfileIcon(num),
    };
    if (!chats.some((c) => c.id === num)) setChats((c) => [neo, ...c]);
    return neo;
  };
  const handleSearchChange = (v: string) => setSearchQuery(v);
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim() && isPhoneNumber(searchQuery)) {
      const neo = createNewChat(searchQuery);
      setActiveChat(neo.id);
      setSearchQuery("");
    }
  };
  const handleInstantReply = (text: string) => {
    setInput(text);
    setShowInstantReply(false);
  };
  const openContact = async () => {
    const chat = chats.find((c) => c.id === activeChat);
    if (!chat?.id) return toast.error("Phone number not available");
    try {
      const res = await fetch(
        `/api/contacts/by-phone?phone=${encodeURIComponent(chat.id)}`
      );
      const data = await res.json();
      if (data.id)
        router.push(`/dashboard/contacts?contactId=${data.id}&from=whatsapp`);
      else {
        // Contact not found - do nothing, the "Save contact" option will be shown in header
      }
    } catch {
      // If API fails, do nothing - the "Save contact" option will be shown in header
    }
  };

  // Function to check if contact exists and show save contact option
  const checkContactExists = async (phoneNumber: string) => {
    try {
      const res = await fetch(
        `/api/contacts/by-phone?phone=${encodeURIComponent(phoneNumber)}`
      );
      const data = await res.json();
      const exists = !!data.id;

      // Update chat name if contact found
      if (exists) {
        const contactName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.company_name;
        if (contactName) {
          setChats(prev => prev.map(c => c.id === phoneNumber && c.name === phoneNumber ? { ...c, name: contactName } : c));
        }
      }

      return exists; // Return true if contact exists
    } catch (err) {
      console.error('AgentWhatsApp: Error checking contact exists:', err);
      return false;
    }
  };
  const handleChatRightClick = (e: React.MouseEvent, chatId: string) => {
    if (!canTransfer()) return;
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      chatId,
    });
  };

  /* ---------- computed ---------- */
  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showNewChatOption =
    searchQuery.trim() &&
    isPhoneNumber(searchQuery) &&
    !chats.some((c) => c.id === formatPhoneNumber(searchQuery));
  const canAccessChat = (chat: Chat) => {
    if (canViewAll()) return true;
    if (canViewAssigned() && chat.assigned_to === agentData.username)
      return true;
    return false;
  };
  const accessibleChats = filteredChats.filter(canAccessChat);

  /* ---------- 24-hour window calculation ---------- */
  const is24hLocked = useMemo(() => {
    const inboundMessages = messages.filter(m => m.direction === 'IN');

    if (inboundMessages.length === 0) {
      return true; // No inbound messages = locked
    }

    const lastMsg = inboundMessages[inboundMessages.length - 1];
    if (!lastMsg.timestamp) {
      return true; // No timestamp = assume locked for safety
    }

    const lastInboundTime = new Date(lastMsg.timestamp).getTime();
    const timeSinceLastMessage = Date.now() - lastInboundTime;
    const is24Hours = timeSinceLastMessage > (24 * 60 * 60 * 1000);


    return is24Hours;
  }, [messages]);

  /* ---------- render ---------- */
  if (hasAccess === null)
    return (
      <div className={styles.container}>
        <Spinner size="large" text="Refreshing permissions..." />
      </div>
    );

  if (!hasAccess)
    return (
      <div className={styles.container}>
        <div className={styles.noPermission}>
          <h2>Access Denied</h2>
          <p>You do not have permission to access WhatsApp chats.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );

  return (
    <div className={styles.container}>
      {/* ---- header ---- */}
      <div className={styles.agentHeader}>
        <div className={styles.agentInfo}>
          <h3 className={styles.agentName}>
            {agentData.full_name ? (
              <>
                Agent: {agentData.full_name}
                <span className={styles.username}> ({agentData.username})</span>
              </>
            ) : (
              `Agent: ${agentData.username}`
            )}
          </h3>
          <div className={styles.permissions}>
            {/* Header */}
            <div
              className={styles.dropdownHeader}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <p>Permissions</p>
              <i
                className={`fa-light fa-chevron-down ${showDropdown ? styles.rotate : ""
                  }`}
              ></i>
            </div>

            {/* Dropdown list - header ke sibling */}
            {showDropdown && (
              <ul className={styles.dropdownList}>
                {agentPermissions.length ? (
                  agentPermissions.map((p) => (
                    <li
                      key={p.permission_type}
                      className={styles.permissionTag}
                    >
                      {p.permission_type.replace("_", " ").toUpperCase()}
                    </li>
                  ))
                ) : (
                  <li className={styles.permissionTag}>BASIC ACCESS</li>
                )}
              </ul>
            )}
          </div>


        </div>

        <div className={styles.agentnumberSelection}>
          <label>
            <strong>Send From:</strong>
          </label>
          <select
            value={selectedWhatsAppNumber}
            onChange={(e) => setSelectedWhatsAppNumber(e.target.value)}
            className={styles.whatsappSelect}
          >
            {availableWhatsAppNumbers.map((n) => (
              <option key={n.id} value={n.number}>
                {n.display_name} ({n.formatted})
                {n.is_default ? " [Primary]" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.templateSettings}>
          <button
            onClick={() => setShowTemplateSettings(true)}
            className={styles.agentsettingsBtn}
            title="Manage Templates"
          >
            Templates
          </button>
        </div>

        <div className={styles.connectionStatus}>
          <div
            className={`${styles.statusIndicator} ${styles[connectionStatus]}`}
          >
            {connectionStatus === "connected" && "🟢"}
            {connectionStatus === "connecting" && "🟡"}
            {connectionStatus === "disconnected" && "🔴"}
            <span>Real-time: {connectionStatus}</span>
          </div>
          {messageCount > 0 && <small>Messages received: {messageCount}</small>}
        </div>
      </div>

      {/* ---- main content ---- */}
      <div className={styles.mainContent}>
        {/* sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search chats or enter phone number (+919876543210)"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          </div>

          <div className={styles.chatList}>
            {accessibleChats.length === 0 ? (
              <div className={styles.noChats}>
                <p>No chats available</p>
                {!canViewAll() && (
                  <p>
                    <small>You can only see assigned chats</small>
                  </p>
                )}
              </div>
            ) : (
              <>
                {showNewChatOption && (
                  <div
                    className={`${styles.chatItem} ${styles.newChatItem}`}
                    onClick={() => {
                      const neo = createNewChat(searchQuery);
                      setActiveChat(neo.id);
                      setSearchQuery("");
                    }}
                  >
                    <div className={styles.newChatIcon}>
                      <i className="fa-light fa-mobile-screen" />
                    </div>
                    <div className={styles.chatInfo}>
                      <div className={styles.chatHeaderTwo}>
                        <div className={styles.chatNameContainer}>
                          <span className={styles.chatName}>Start new chat</span>
                        </div>
                      </div>
                      <div className={styles.chatPreview}>
                        <p>Send message to {formatPhoneNumber(searchQuery)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {accessibleChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`${styles.chatItem} ${activeChat === chat.id ? styles.active : ""
                      }`}
                    onClick={() => {
                      setActiveChat(chat.id);
                      fetchMessages(chat.id);
                      if (chat.unread > 0)
                        setChats((c) =>
                          c.map((x) =>
                            x.id === chat.id ? { ...x, unread: 0 } : x
                          )
                        );
                    }}
                    onContextMenu={(e) => handleChatRightClick(e, chat.id)}
                  >
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className={styles.avatar}
                    />
                    <div className={styles.chatInfo}>
                      <div className={styles.chatHeaderTwo}>
                        <div className={styles.chatNameContainer}>
                          <span className={styles.chatName}>{chat.name}</span>
                          {chat.assigned_to && (
                            <span
                              className={styles.assignedBadge}
                              title={`Assigned to ${chat.assigned_to}`}
                            >
                              Assigned
                            </span>
                          )}
                        </div>
                        <span className={styles.chatTime}>{chat.time}</span>
                      </div>
                      <div className={styles.chatPreview}>
                        <p>{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <span className={styles.unreadBadge}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <button
            className={styles.fabButton}
            onClick={() => setShowNewChatModal(true)}
            title="Start New Chat"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* chat area */}
        <div className={styles.chatArea}>
          {activeChat ? (
            <>
              <div className={styles.chatHeader}>
                {chats.find((c) => c.id === activeChat) && (
                  <>
                    <img
                      src={chats.find((c) => c.id === activeChat)!.avatar}
                      alt={chats.find((c) => c.id === activeChat)!.name}
                      className={styles.chatAvatar}
                      onClick={openContact}
                      style={{ cursor: "pointer" }}
                    />

                    <div className={styles.chatUserInfo}>
                      <div className={styles.chatUserInfoHeader}>
                        <h2>{chats.find((c) => c.id === activeChat)!.name}</h2>
                        {/* Show Save Contact option if contact doesn't exist */}
                        {contactExists === false && (
                          <span
                            className={styles.saveContactOption}
                            onClick={() => setShowContactModal(true)}
                            title="Save this contact"
                          >
                            <i className="fa-light fa-user-plus"></i> Save contact
                          </span>
                        )}
                      </div>
                      <div className={styles.chatUserInfoStatus}>
                        <p>Online</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* messages */}
              <div className={styles.messagesContainer} ref={listRef}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.direction === "OUT"
                      ? styles.outgoing
                      : styles.incoming
                      }`}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    style={{ position: 'relative' }}
                  >
                    {/* Reaction button */}
                    {hoveredMessageId === msg.id && msg.direction === "IN" && (
                      <button
                        className={styles.reactionButton}
                        onClick={() => handleReactionClick(msg.id)}
                        title="React to this message"
                      >
                        😊
                      </button>
                    )}
                    <div className={styles.messageContent}>
                      {msg.media_type === 'location' ? (
                        <div className={styles.locationMessage}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${msg.latitude},${msg.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.locationLink}
                          >
                            <img
                              src={`https://maps.googleapis.com/maps/api/staticmap?center=${msg.latitude},${msg.longitude}&zoom=15&size=400x200&markers=color:red%7C${msg.latitude},${msg.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`}
                              alt="Location Map"
                              className={styles.locationImage}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const p = e.currentTarget.parentElement;
                                if (p) {
                                  const fallback = document.createElement('div');
                                  fallback.style.background = '#f0f0f0';
                                  fallback.style.padding = '20px';
                                  fallback.style.textAlign = 'center';
                                  fallback.style.borderRadius = '8px';
                                  const lat = msg.latitude || '?';
                                  const lng = msg.longitude || '?';
                                  fallback.innerHTML = `<i class="fa-solid fa-location-dot" style="font-size: 24px; color: #ff5252; margin-bottom: 8px;"></i><p style="margin: 0; font-weight: 500;">Shared Location</p><small style="color: #666;">${lat}, ${lng}</small>`;
                                  if (e.currentTarget.parentNode === p) p.replaceChild(fallback, e.currentTarget);
                                  else p.appendChild(fallback);
                                }
                              }}
                            />
                            <div className={styles.locationInfo}>
                              <i className="fa-solid fa-location-dot"></i>
                              <span>{msg.content || 'Shared Location'}</span>
                            </div>
                          </a>
                        </div>
                      ) : (msg.media_type === 'reaction' || (typeof msg.content === 'string' && msg.content.startsWith('Reaction:'))) ? (
                        <div className={styles.reactionMessage} style={{
                          fontSize: '1.2em',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {/* Show just the emoji */}
                          <span>{(msg.content || '').replace('Reaction:', '').trim()}</span>
                        </div>
                      ) : msg.media_url && msg.media_type && msg.media_type !== 'template' ? (
                        <div className={styles.mediaMessage}>
                          {msg.media_type.startsWith("image") && (
                            <div className={styles.imageMessage}>
                              <img
                                src={msg.media_url}
                                alt={msg.media_filename || "Image"}
                                className={styles.messageImage}
                                onClick={(e) => {
                                  // Simplified safe click handler
                                  window.open(msg.media_url!, '_blank');
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display =
                                    "none";
                                  const fallback = (e.target as HTMLElement)
                                    .nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                              <div
                                className={styles.imageError}
                                style={{ display: "none" }}
                              >
                                <i
                                  className="fa-light fa-image"
                                  style={{ fontSize: "2rem", color: "#ccc" }}
                                />
                                <p>Image unavailable</p>
                                <small>{msg.media_filename}</small>
                              </div>
                              {msg.media_caption && (
                                <div className={styles.mediaCaption}>
                                  {msg.media_caption}
                                </div>
                              )}
                            </div>
                          )}

                          {msg.media_type.startsWith("video") && (
                            <div className={styles.videoMessage}>
                              <video
                                src={msg.media_url}
                                controls
                                className={styles.messageVideo}
                                preload="metadata"
                              />
                              {msg.media_caption && (
                                <div className={styles.mediaCaption}>
                                  {msg.media_caption}
                                </div>
                              )}
                            </div>
                          )}




                          {msg.media_type?.startsWith("audio") && (
                            <div className={styles.audioMessage}>
                              <audio
                                src={msg.media_url || undefined}
                                controls
                                className={styles.messageAudio}
                              />
                              <div className={styles.audioInfo}>
                                <i className="fa-light fa-music" />
                                <span>
                                  {msg.media_filename || "Audio message"}
                                </span>
                              </div>
                              {msg.media_caption && (
                                <div className={styles.mediaCaption}>
                                  {msg.media_caption}
                                </div>
                              )}
                            </div>
                          )}

                          {!["image", "video", "audio", "location"].some((type) =>
                            msg.media_type!.startsWith(type)
                          ) && (
                              <div className={styles.documentMessage}>
                                <a
                                  href={msg.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.documentLink}
                                >
                                  <i className="fa-light fa-file" />
                                  <div className={styles.documentInfo}>
                                    <span className={styles.documentName}>
                                      {msg.media_filename || "Document"}
                                    </span>
                                    <span className={styles.documentType}>
                                      {msg.media_type
                                        .split("/")[1]
                                        ?.toUpperCase() || "FILE"}
                                    </span>
                                  </div>
                                  <i className="fa-light fa-download" />
                                </a>
                                {msg.media_caption && (
                                  <div className={styles.mediaCaption}>
                                    {msg.media_caption}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      ) : msg.media_type === 'template' ? (
                        (() => {
                          // Parse buttons from content (stored as HTML comment)
                          let buttons: any[] = [];
                          let displayContent = msg.content;

                          try {
                            // Try to extract buttons from content (multiline safe)
                            const buttonMatch = msg.content.match(/<!--BUTTONS:([\s\S]+?)-->/);

                            if (buttonMatch) {
                              buttons = JSON.parse(buttonMatch[1]);
                              // Remove the button comment from display content
                              displayContent = msg.content.replace(/\n?<!--BUTTONS:[\s\S]+?-->/, '');
                            } else {
                            }
                          } catch (e) {
                          }

                          // Fallback: If no buttons found in content, check for old hardcoded patterns
                          if (buttons.length === 0) {
                            const fallbackButtons: any[] = [];
                            if (msg.content.includes('Visit us')) {
                              fallbackButtons.push({ type: 'URL', text: 'Visit us' });
                            }
                            if (msg.content.includes('Reply')) {
                              fallbackButtons.push({ type: 'QUICK_REPLY', text: 'Reply' });
                            }
                            if (msg.content.includes('Share Documents')) {
                              fallbackButtons.push({ type: 'URL', text: 'Share Documents' });
                            }
                            if (msg.content.includes('Call Now')) {
                              fallbackButtons.push({ type: 'PHONE_NUMBER', text: 'Call Now' });
                            }
                            buttons = fallbackButtons;
                          }

                          return (
                            <div className={styles.templateMessage}>
                              <div className={styles.templateBody}>
                                {/* Show actual image if template has header image */}
                                {msg.media_url && (
                                  <div className={styles.templateImagePlaceholder}>
                                    <img
                                      src={msg.media_url}
                                      alt="Template header"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '6px'
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const placeholder = e.currentTarget.parentElement;
                                        if (placeholder) {
                                          placeholder.innerHTML = '<i class="fa-light fa-image" style="font-size: 3rem; color: #999;"></i>';
                                        }
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Template text content */}
                                <div className={styles.templateText}>
                                  {displayContent}
                                </div>

                                {/* Footer text (if present) */}
                                {displayContent.includes('Team ConsoLegal') && (
                                  <>
                                    <hr className={styles.templateDivider} />
                                    <div className={styles.templateFooter}>
                                      Team ConsoLegal
                                    </div>
                                  </>
                                )}

                                {/* Dynamic Template buttons */}
                                {buttons.length > 0 && (
                                  <div className={styles.templateButtons}>
                                    {buttons.map((button: any, index: number) => {
                                      // Determine icon based on button type (case-insensitive)
                                      let icon = 'fa-reply';
                                      const btnType = (button.type || '').toUpperCase();

                                      if (btnType === 'URL') {
                                        icon = 'fa-arrow-up-right-from-square';
                                      } else if (btnType === 'PHONE_NUMBER') {
                                        icon = 'fa-phone';
                                      } else if (btnType === 'QUICK_REPLY') {
                                        icon = 'fa-reply';
                                      }

                                      return (
                                        <button key={index} className={styles.templateButton}>
                                          <i className={`fa-light ${icon}`}></i>
                                          {button.text}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : msg.content === '[unsupported message]' || msg.media_type === 'unsupported' ? (
                        <span style={{
                          fontStyle: 'italic',
                          color: '#888',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(0,0,0,0.03)',
                          borderRadius: '4px',
                          fontSize: '0.9em'
                        }}>
                          <i className="fa-light fa-ban"></i>
                          <span>Unsupported message type (e.g. Sticker/Reaction)</span>
                        </span>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className={styles.messageMeta}>
                      <span className={styles.messageTime}>{msg.time}</span>
                      {msg.direction === "OUT" && (
                        <span className={styles.messageStatus}>
                          {msg.status === "read" || msg.status === "delivered"
                            ? "✓✓"
                            : msg.status === "sent"
                              ? "✓"
                              : ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* input */}
              {(() => {
                const currentChat = chats.find((c) => c.id === activeChat);

                // Check if user is admin or super agent (bypass permission check)
                const isAdmin = agentData.permissions?.admin && Array.isArray(agentData.permissions.admin) && agentData.permissions.admin.length > 0;
                const isSuperAgent = agentData.roles?.includes('Super Agent');

                // Admin and Super Agent can always reply
                const canReply =
                  isAdmin ||
                  isSuperAgent ||
                  canReplyAll() ||
                  (canReplyAssigned() &&
                    currentChat?.assigned_to === agentData.username);






                // Use the reactive is24hLocked from useMemo (calculated above)
                if (!canReply)
                  return (
                    <div className={styles.noReplyPermission}>
                      <p>You do not have permission to reply to this chat</p>
                      {/* <small>Debug info removed for cleanliness</small> */}
                    </div>
                  );
                return (
                  <div className={styles.inputArea}>
                    {!isViewOnlyAgent() && (
                      <>
                        <button
                          onClick={() => setShowTemplateModal(true)}
                          className={styles.templateButton}
                          title="Send Template"
                        >
                          📄
                        </button>
                        <button
                          onClick={() => setShowMediaUpload(true)}
                          className={styles.mediaButton}
                          title={is24hLocked ? "Media sending disabled outside 24h window" : "Send Media"}
                          disabled={is24hLocked}
                          style={is24hLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          📎
                        </button>
                      </>
                    )}
                    {!isViewOnlyAgent() && (
                      <InstantReply
                        onSendReply={handleInstantReply}
                        isVisible={showInstantReply}
                        onToggle={() => setShowInstantReply((s) => !s)}
                      />
                    )}
                    <input
                      type="text"
                      placeholder={is24hLocked ? "Customer reply needed to unlock chat..." : "Type a message..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (is24hLocked) return;

                          sendMessage();
                        }
                      }}
                      disabled={loading || is24hLocked}
                      style={is24hLocked ? { backgroundColor: '#f0f0f0', color: '#666' } : {}}
                    />
                    <button
                      onClick={() => {

                        sendMessage();
                      }}
                      disabled={loading || !input.trim() || is24hLocked}
                      style={is24hLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {loading ? (
                        "..."
                      ) : (
                        <svg viewBox="0 0 24 24" width="24" height="24">
                          <path
                            fill="currentColor"
                            d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className={styles.emptyState}>
              <h2>WhatsApp Agent Panel</h2>
              <p>Select a chat to start messaging</p>

              <div className={styles.permissionInfo}>
                <h4 className={styles.permissionTitle}>Your Permissions</h4>

                {/* Agent Type Badge */}
                <div className={styles.agentTypeBadge}>
                  <span className={`${styles.agentType} ${styles[getAgentType()]}`}>
                    {getAgentType().toUpperCase().replace("-", " ")} AGENT
                    {canTransfer() && (
                      <span className={styles.transferIcon} title="Can transfer chats">
                        🔄
                      </span>
                    )}
                  </span>
                </div>

                <ul className={styles.permissionList}>
                  {agentPermissions.length ? (
                    agentPermissions.map((p) => (
                      <li
                        key={p.permission_type}
                        className={styles.permissionTag}
                      >
                        {p.permission_type.replace("_", " ").toUpperCase()}
                      </li>
                    ))
                  ) : (
                    <li className={styles.permissionTag}>BASIC ACCESS</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- modals ---- */}
      <InteractiveListModal
        isOpen={showInteractiveModal}
        onClose={() => setShowInteractiveModal(false)}
        onSend={sendInteractiveList}
        recipientNumber={activeChat || ""}
        fromNumber={selectedWhatsAppNumber}
      />
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSend={sendTemplate}
        recipientNumber={activeChat || ""}
        fromNumber={selectedWhatsAppNumber}
      />
      <TemplateSettings
        isOpen={showTemplateSettings}
        onClose={() => setShowTemplateSettings(false)}
      />
      <MediaUpload
        isOpen={showMediaUpload}
        onClose={() => {
          setShowMediaUpload(false);
          setSelectedMessageForReaction(null);
        }}
        recipientNumber={activeChat || ""}
        fromNumber={selectedWhatsAppNumber}
        onSendMedia={sendMedia}
        agentId={agentData.id}
        replyToMessageId={selectedMessageForReaction || undefined}
      />

      {/* image modal */}
      {imageModalOpen && selectedImage && (
        <div
          className={styles.imageModalOverlay}
          onClick={() => setImageModalOpen(false)}
        >
          <div className={styles.imageModalContent}>
            <button
              className={styles.imageModalClose}
              onClick={() => setImageModalOpen(false)}
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className={styles.fullSizeImage}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* context menu (transfer permissions only) */}
      {canTransfer() && (
        <ChatContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={() =>
            setContextMenu({
              isOpen: false,
              position: { x: 0, y: 0 },
              chatId: null,
            })
          }
          chatId={contextMenu.chatId || ""}
          chatName={chats.find((c) => c.id === contextMenu.chatId)?.name || ""}
          agents={availableAgents}
          onAssign={async (agentId) => {
            if (!contextMenu.chatId) return;
            try {
              const res = await fetch("/api/assign-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: contextMenu.chatId, agentId }),
              });
              if (res.ok) toast.success("Chat assigned");
              else toast.error("Failed to assign");
            } catch {
              toast.error("Error assigning chat");
            }
          }}
          onUnassign={async () => {
            if (!contextMenu.chatId) return;
            try {
              const res = await fetch(
                `/api/assign-chat?chatId=${contextMenu.chatId}`,
                { method: "DELETE" }
              );
              if (res.ok) toast.success("Assignment removed");
              else toast.error("Failed to remove assignment");
            } catch {
              toast.error("Error removing assignment");
            }
          }}
          isAssigned={false} // simplify for agent panel
          currentAssignment={undefined}
        />
      )}

      {/* Contact Modal */}
      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
          onSuccess={() => {
            toast.success(`Contact created successfully!`);
            setShowContactModal(false);
            if (activeChat) checkContactExists(chats.find(c => c.id === activeChat)?.id || "");
          }}
          contact={{
            phone: chats.find((c) => c.id === activeChat)?.id || "",
            first_name: chats.find((c) => c.id === activeChat)?.name?.split(' ')[0] || "",
            last_name: chats.find((c) => c.id === activeChat)?.name?.split(' ').slice(1).join(' ') || ""
          }}
        />
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onStartChat={(phoneNumber) => {
          const neo = createNewChat(phoneNumber);
          setActiveChat(neo.id);
          setSearchQuery("");
        }}
      />
    </div>
  );
}
