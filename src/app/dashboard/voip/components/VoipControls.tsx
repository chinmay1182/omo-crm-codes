import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import styles from "../styles.module.css";
import IncomingCallPopup from "./IncomingCallPopup";
import { voipEventBus } from '@/app/lib/voipEventBus';

interface AgentPermissions {
  canViewAllCalls: boolean;
  canViewAssignedCalls: boolean;
  canMakeCalls: boolean;
  canTransferCalls: boolean;
  canConferenceCalls: boolean;
}

interface VoipControlsProps {
  token: string;
  cliNumber: string; // Now passed as prop from parent
  agentPermissions?: AgentPermissions;
  agentData?: {
    id: number;
    username: string;
    full_name?: string;
    phone_number?: string;
  };
}

interface IncomingCall {
  CALL_ID?: string;
  call_id?: string;
  A_PARTY_NO?: string;
  aparty?: string;
  from?: string;
  B_PARTY_NO?: string;
  bparty?: string;
  to?: string;
  CALL_START_TIME?: string;
  timestamp?: string;
  EVENT_TYPE?: string;
  call_source?: string;
  is_ivr_call?: boolean;
  source?: string;
  DTMF?: string;
  Agent_number?: string;
  status?: string;
  _original?: any; // Allow access to original data
}

interface SSEEvent {
  type: string;
  timestamp: string;
  data: IncomingCall;
  source?: string;
}

// (Helper functions omitted for brevity matching target)

async function fetchAuthTokenForCli(cliNumber: string) {
  try {
    // First get CLI credentials from database
    const cliRes = await fetch("/api/cli-numbers");
    if (!cliRes.ok) {
      throw new Error("Failed to fetch CLI numbers");
    }

    const cliNumbers = await cliRes.json();
    const cli = cliNumbers.find((c: any) => c.number === cliNumber);

    if (!cli) {
      throw new Error(`CLI number ${cliNumber} not found in database`);
    }

    if (!cli.auth_username || !cli.auth_password) {
      throw new Error(
        `No authentication credentials found for CLI ${cliNumber}`
      );
    }


    const res = await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "",
        endpoint: "AuthToken",
        payload: {
          username: cli.auth_username,
          password: cli.auth_password,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }

    const data = await res.json();

    if (data.idToken) {
      return data.idToken;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error("No authentication token received");
    }
  } catch (error: any) {
    console.error("Authentication error:", error);
    throw new Error(
      `Failed to fetch auth token for CLI ${cliNumber}: ${error.message || error}`
    );
  }
}

async function callAPI(token: string, endpoint: string, payload: any) {
  const res = await fetch("/api/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, endpoint, payload }),
  });
  return res.json();
}

async function answerCall(token: string, callId: string) {
  const res = await fetch("/api/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      endpoint: "AnswerCall",
      payload: { call_id: callId },
    }),
  });
  return res.json();
}

async function rejectCall(token: string, callId: string, cliNumber: string) {
  const res = await fetch("/api/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      endpoint: "CallDisconnection",
      payload: { cli: cliNumber, call_id: callId },
    }),
  });
  return res.json();
}

const VoipControls: React.FC<VoipControlsProps> = ({
  token: parentToken,
  cliNumber,
  agentPermissions,
  agentData,
}) => {
  const [token, setToken] = useState(parentToken);
  const [callStatus, setCallStatus] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [aParty, setAParty] = useState("");
  const [bParty, setBParty] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [currentReferenceId, setCurrentReferenceId] = useState<string | null>(
    null
  );
  const [holdStatus, setHoldStatus] = useState("");
  const [conferenceNumber, setConferenceNumber] = useState("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [popupTimeout, setPopupTimeout] = useState<NodeJS.Timeout | null>(null);

  // Outgoing call state for popup
  const [outgoingCall, setOutgoingCall] = useState<{
    callId: string;
    to: string;
    status: 'Initiating' | 'Ringing' | 'Connected' | 'Ended';
    startTime: string;
  } | null>(null);

  // Ref to track latest incoming call state for SSE closure
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const outgoingCallRef = useRef<any>(null);

  // Sync refs with state
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  // Auto-dismiss popup after 30 seconds and mark as missed call
  useEffect(() => {
    if (incomingCall) {
      // If call is connected, keep popup open until call ends
      if (incomingCall.status === 'Connected') {
        if (popupTimeout) {
          clearTimeout(popupTimeout);
          setPopupTimeout(null);
        }
        // Logs removed for performance
        return;
      }

      // Logs removed for performance

      // Clear any existing timeout
      if (popupTimeout) {
        clearTimeout(popupTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        // Logs removed for performance

        // Clear the popup
        setIncomingCall(null);
        voipEventBus.emit('incoming_call_cleared', null);

        // Show notification
        toast.error('📞 Call missed - no answer after 30 seconds', {
          duration: 5000,
          id: 'call-missed'
        });

        // Log missed call event
        const callId = incomingCall.CALL_ID || incomingCall.call_id;
        if (callId) {
          logCallEvent(`missed_${callId}`, 'missed_timeout');
        }

      }, 30000); // 30 seconds timeout

      setPopupTimeout(timeout);

      // Cleanup function
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else {
      // Clear timeout when no incoming call
      if (popupTimeout) {
        clearTimeout(popupTimeout);
        setPopupTimeout(null);
      }
    }
  }, [incomingCall]);

  // Debug effect removed for perf
  useEffect(() => {
    // Monitoring removed
  }, [incomingCall]);


  // Set A Party based on Agent Phone Number OR passed CLI number configuration
  useEffect(() => {
    // Check if user is an admin - simpler check based on agentData or permissions
    const isAdmin = agentData?.username === 'admin@example.com' || (agentPermissions && Object.keys(agentPermissions).includes('admin'));

    // Logs removed for performance

    // Priority 1: Agent's Assigned Phone Number (ONLY if NOT Admin and number exists)
    if (!isAdmin && agentData?.phone_number) {
      // Clean the phone number - remove country code prefix if present
      let cleanedPhone = agentData.phone_number;

      // Remove '91' prefix if present (Indian country code)
      if (cleanedPhone.startsWith('91') && cleanedPhone.length > 10) {
        cleanedPhone = cleanedPhone.substring(2);
      }

      // Remove '+91' prefix if present
      if (cleanedPhone.startsWith('+91')) {
        cleanedPhone = cleanedPhone.substring(3);
      }

      // Logs removed for performance
      setAParty(cleanedPhone);
      return;
    }

    // Priority 2: CLI's configured A-Party (fallback for Agents without phone, or always for Admins)
    const fetchAParty = async () => {
      try {
        const response = await fetch("/api/cli-numbers");
        if (response.ok) {
          const numbers = await response.json();

          // Find the current CLI and set its A Party
          const currentCli = numbers.find(
            (cli: any) => cli.number === cliNumber
          );
          if (currentCli && currentCli.aparty) {
            // Clean the aparty number - remove country code prefix if present
            let cleanedAParty = currentCli.aparty;

            // Remove '91' prefix if present (Indian country code)
            if (cleanedAParty.startsWith('91') && cleanedAParty.length > 10) {
              cleanedAParty = cleanedAParty.substring(2);
            }

            // Remove '+91' prefix if present
            if (cleanedAParty.startsWith('+91')) {
              cleanedAParty = cleanedAParty.substring(3);
            }

            // Logs removed for performance
            setAParty(cleanedAParty);
          } else {
            // Fallback to CLI number if no A Party is set
            setAParty(cliNumber);
          }
        }
      } catch (error) {
        console.error("Error fetching CLI numbers:", error);
        // Fallback to CLI number
        setAParty(cliNumber);
      }
    };

    fetchAParty();
  }, [cliNumber, agentData, agentPermissions]);

  // Authentication effect
  // Authentication effect
  useEffect(() => {
    if (parentToken) {
      setToken(parentToken);
      setCallStatus("Authenticated");
      return;
    }

    let isMounted = true;

    // Only attempt authentication if we have a valid CLI number
    if (!cliNumber) {
      setCallStatus("No CLI number selected");
      return;
    }

    fetchAuthTokenForCli(cliNumber)
      .then((t) => {
        if (!isMounted) return;
        setToken(t);
        setCallStatus("Authenticated");
        toast.success(`Authentication successful for CLI ${cliNumber}`);
      })
      .catch((error: Error) => {
        if (!isMounted) return;
        console.error("Authentication failed:", error);
        setCallStatus("Auth failed: " + error.message);
        toast.error("Authentication failed: " + error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [parentToken, cliNumber]);
  // Fixed SSE connection with proper event parsing
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let healthCheckInterval: NodeJS.Timeout | null = null;
    let lastMessageTime = Date.now();
    const maxReconnectAttempts = 10; // Increased from 5
    let reconnectAttempts = 0;
    const HEALTH_CHECK_INTERVAL = 20000; // Check every 20 seconds
    const MAX_SILENCE_DURATION = 45000; // Reconnect if no message for 45 seconds

    const connectEventSource = () => {
      try {
        // Close existing connection if any
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource("https://crm.consolegal.com/api/pingback/stream");
        lastMessageTime = Date.now();

        eventSource.onopen = () => {
          reconnectAttempts = 0; // Reset attempts on successful connection
          lastMessageTime = Date.now();
        };

        eventSource.onmessage = (event) => {
          lastMessageTime = Date.now(); // Update last message time on any message

          try {
            // Logs removed for performance
            const eventData: SSEEvent = JSON.parse(event.data);
            const eventType = String(eventData.type || '').trim();

            // Logs removed for performance

            // PRIORITY 1: Handle call termination and status events FIRST
            if (
              eventType === "call_end" ||
              eventType === "call_ended" ||
              eventType === "hangup" ||
              eventType === "call_disconnected" ||
              eventType === "call_terminated" ||
              eventType === "disconnect" ||
              eventType === "missed_call" ||
              eventType === "ivr_missed_call" ||
              eventType === "answered_call" ||
              eventType === "call_status_update" ||
              eventType === "outgoing_event"
            ) {
              const originalEventData = (eventData.data as any)?._original || {};
              const eventCallId =
                eventData.data?.CALL_ID ||
                eventData.data?.call_id ||
                originalEventData.callid ||
                originalEventData.CallId ||
                originalEventData.Call_Id ||
                originalEventData.uniqueid;

              const currentCall = incomingCallRef.current;
              const currentOutgoingCall = outgoingCallRef.current;

              // Check for BOTH incoming and outgoing calls
              const hasActiveCall = currentCall || currentOutgoingCall;

              // If we have an active popup (incoming OR outgoing), process the event
              if (hasActiveCall) {
                const currentId = currentCall?.CALL_ID || currentCall?.call_id;
                const outgoingId = currentOutgoingCall?.callId;

                // Check if this event is for the current call (incoming or outgoing)
                const isMatch = eventCallId && (currentId === eventCallId || outgoingId === eventCallId);
                const isLooseMatch = !eventCallId; // If no ID, assume it's for current call

                if (isMatch || isLooseMatch) {
                  // Check if call has ended - comprehensive detection
                  const callEndTime =
                    originalEventData.Call_endtime ||
                    originalEventData.call_endtime ||
                    originalEventData.Agent_disconnect_time ||
                    originalEventData.Agent_call_end_time ||
                    originalEventData.time_end ||
                    originalEventData.Agent_dial_end_time ||
                    originalEventData.Agent_dial_end ||
                    originalEventData.end_time ||
                    originalEventData.disconnect_time ||
                    originalEventData.B_PARTY_END_TIME ||
                    originalEventData.A_PARTY_END_TIME;

                  const isMissedEvent = eventType === "missed_call" || eventType === "ivr_missed_call";
                  const isAnsweredEvent = eventType === "answered_call";

                  // Check for disconnect signals in various fields
                  const disconnectedBy = originalEventData.DISCONNECTED_BY || originalEventData.disconnected_by || '';
                  const hasDisconnectSignal = disconnectedBy && disconnectedBy !== '' && disconnectedBy !== '0';

                  // Check B-Party status for disconnection
                  const bPartyStatus = (
                    originalEventData.B_DIAL_STATUS ||
                    originalEventData.b_dial_status ||
                    originalEventData.B_party_status ||
                    ''
                  ).toString().toLowerCase();

                  const bPartyDisconnected = bPartyStatus.includes('disconnect') || bPartyStatus.includes('not connected');

                  // Check release reasons
                  const aPartyRelease = originalEventData.A_PARTY_RELEASE_REASON || '';
                  const bPartyRelease = originalEventData.B_PARTY_RELEASE_REASON || '';
                  const hasReleaseReason = (aPartyRelease && aPartyRelease !== '0 | Not Available') ||
                    (bPartyRelease && bPartyRelease !== '0 | Not Available');

                  const hasCallEnded =
                    isMissedEvent ||
                    eventType === "call_end" ||
                    eventType === "call_ended" ||
                    eventType === "hangup" ||
                    eventType === "call_disconnected" ||
                    eventType === "call_terminated" ||
                    eventType === "disconnect" ||
                    (callEndTime && callEndTime !== "0" && callEndTime !== "" && callEndTime.length > 5) ||
                    originalEventData.Event_type === 'Call_disconnected' ||
                    originalEventData.EVENT_TYPE === 'Call_disconnected' ||
                    originalEventData.status === 'Disconnected' ||
                    originalEventData.Aparty_status === 'Disconnected' ||
                    originalEventData.A_DIAL_STATUS === 'Disconnected' ||
                    originalEventData.Bparty_status === 'Disconnected' ||
                    bPartyDisconnected ||
                    hasDisconnectSignal ||
                    (hasReleaseReason && (callEndTime && callEndTime !== "0"));

                  // Check if call is connected
                  const actuallyConnected =
                    originalEventData.Aparty_status === 'Connected' ||
                    originalEventData.status === 'Connected' ||
                    eventData.data?.status === 'Connected';

                  // Logs removed for performance

                  // PRIORITY: If it's a missed call event, ALWAYS clear the popup
                  if (isMissedEvent) {
                    // Logs removed for performance

                    // Extract caller number from missed_call event (often has more complete data)
                    const fromNumber =
                      eventData.data?.A_PARTY_NO ||
                      eventData.data?.aparty ||
                      eventData.data?.from ||
                      originalEventData['a_party number'] ||
                      originalEventData.A_PARTY_NO ||
                      originalEventData.clid ||
                      originalEventData.caller_id ||
                      originalEventData.src ||
                      currentCall?.A_PARTY_NO; // Fallback to existing

                    // Determine if call was actually connected before ending
                    const wasConnected =
                      currentCall?.status === 'Connected' ||
                      actuallyConnected;

                    // Choose appropriate message
                    const endMessage = wasConnected ? 'Call Ended' : 'Call Missed';
                    const toastType = wasConnected ? 'success' : 'error';

                    // If we got a number from this event, briefly update popup before clearing
                    if (currentCall && fromNumber && fromNumber !== currentCall.A_PARTY_NO) {
                      // Logs removed for performance
                      setIncomingCall({
                        ...currentCall,
                        A_PARTY_NO: fromNumber,
                        aparty: fromNumber
                      });

                      // Wait a moment so user can see the number, then clear
                      setTimeout(() => {
                        setIncomingCall(null);
                        voipEventBus.emit('incoming_call_cleared', null);
                        toast.dismiss("incoming-call");
                        if (toastType === 'success') {
                          toast.success(`${endMessage} - ${fromNumber}`, { duration: 3000 });
                        } else {
                          toast.error(`${endMessage} from ${fromNumber}`, { duration: 3000 });
                        }
                      }, 500);
                    } else {
                      // No new number info, clear immediately
                      setIncomingCall(null);
                      voipEventBus.emit('incoming_call_cleared', null);
                      toast.dismiss("incoming-call");
                      if (toastType === 'success') {
                        toast.success(endMessage, { duration: 3000 });
                      } else {
                        toast.error(endMessage, { duration: 3000 });
                      }
                    }
                    return;
                  }

                  // If the call has explicitly ENDED, clear it immediately
                  if (hasCallEnded) {
                    // Logs removed for performance

                    // Handle Incoming Call Termination
                    if (currentCall) {
                      // Logs removed for performance
                      setIncomingCall(null);
                      voipEventBus.emit('incoming_call_cleared', null);
                      toast.dismiss("incoming-call");
                      if (actuallyConnected || currentCall?.status === 'Connected') {
                        toast.success("Call Ended", { duration: 3000 });
                      } else {
                        toast.error("Call Ended");
                      }
                    }

                    // Handle Outgoing Call Termination
                    if (currentOutgoingCall) {
                      // Logs removed for performance
                      const endedCall = { ...currentOutgoingCall, status: 'Ended' as const };
                      setOutgoingCall(endedCall);
                      voipEventBus.emit('outgoing_call_updated', endedCall);
                      setIsCalling(false);
                      setCallId(null);
                      setCurrentReferenceId(null);
                      setIsCallEnded(true);
                      setHoldStatus('');
                      setTimeout(() => {
                        setOutgoingCall(null);
                        voipEventBus.emit('outgoing_call_ended', null);
                      }, 2000);
                      toast('Call Ended', { duration: 2000 });
                    }

                    return;
                  }

                  // If answered/connected (and NOT ended yet), show connected state
                  if (currentCall && isAnsweredEvent && actuallyConnected && !hasCallEnded) {
                    // Logs removed for performance
                    setIncomingCall({
                      ...currentCall,
                      status: 'Connected'
                    });
                    toast.dismiss("incoming-call");
                    toast.success("Call Answered - Connected");
                    return;
                  }
                }

                // Also check if this is for an outgoing call
                if (currentOutgoingCall) {
                  // Convert both IDs to strings for comparison
                  const outgoingIdStr = String(currentOutgoingCall.callId || '');
                  const eventIdStr = String(eventCallId || '');
                  const isOutgoingMatch = eventIdStr && outgoingIdStr === eventIdStr;
                  const isOutgoingLooseMatch = !eventCallId; // If no ID, assume it's for current call

                  // Logs removed for performance

                  if (isOutgoingMatch || isOutgoingLooseMatch) {
                    // Recalculate for outgoing call
                    const callEndTime =
                      originalEventData.Call_endtime ||
                      originalEventData.call_endtime ||
                      originalEventData.Agent_disconnect_time ||
                      originalEventData.Agent_call_end_time ||
                      originalEventData.end_time ||
                      originalEventData.disconnect_time;

                    const outgoingCallEnded =
                      eventType === "missed_call" ||
                      eventType === "call_end" ||
                      eventType === "call_ended" ||
                      eventType === "hangup" ||
                      eventType === "call_disconnected" ||
                      eventType === "call_terminated" ||
                      eventType === "disconnect" ||
                      (callEndTime && callEndTime !== "0" && callEndTime.length > 5) ||
                      originalEventData.Event_type === 'Call_disconnected' ||
                      originalEventData.EVENT_TYPE === 'Call_disconnected' ||
                      originalEventData.status === 'Disconnected' ||
                      originalEventData.Aparty_status === 'Disconnected' ||
                      originalEventData.A_DIAL_STATUS === 'Disconnected';

                    // ------------------------------------------------------------------
                    // CONSOLIDATED OUTGOING CONNECTION LOGIC
                    // ------------------------------------------------------------------
                    const rawEventType = (originalEventData.EVENT_TYPE || '').toLowerCase();
                    const isBParty = rawEventType.includes('b party');
                    const isAParty = rawEventType.includes('a party');

                    // Check for B-Party connection status across multiple vendor formats
                    const bPartyStatus = (
                      originalEventData.B_party_status ||
                      originalEventData.b_party_status ||
                      originalEventData.B_DIAL_STATUS ||
                      originalEventData.b_dial_status ||
                      ''
                    ).toString().toLowerCase();

                    const isBPartyConnected =
                      (isBParty && (rawEventType.includes('connected') || rawEventType.includes('answered'))) ||
                      bPartyStatus.includes('connected') ||
                      bPartyStatus.includes('answered');

                    // Allow 'answered_call' to count as specific Answered event even if it mentions A-party, 
                    // as some providers only send this single event for successful establishment.
                    const isGenericAnswered = eventType === "answered_call";

                    // Trigger Green Popup on verified B-party or generic Answered events
                    const shouldShowConnected = isBPartyConnected || isGenericAnswered;

                    // Logs removed for performance

                    if (outgoingCallEnded) {
                      // Logs removed for performance
                      const endedCall = { ...currentOutgoingCall, status: 'Ended' as const };
                      setOutgoingCall(endedCall);
                      voipEventBus.emit('outgoing_call_updated', endedCall);
                      setIsCalling(false);
                      setCallId(null);
                      setCurrentReferenceId(null);
                      setIsCallEnded(true);
                      setHoldStatus('');
                      setTimeout(() => {
                        setOutgoingCall(null);
                        voipEventBus.emit('outgoing_call_ended', null);
                      }, 2000);
                      toast('Call Ended', { duration: 2000 });
                    } else if (shouldShowConnected) {
                      // Logs removed for performance
                      const connectedCall = {
                        ...currentOutgoingCall,
                        status: 'Connected' as const
                      };
                      setOutgoingCall(connectedCall);
                      voipEventBus.emit('outgoing_call_updated', connectedCall);
                      toast.success('Customer Connected');
                    } else if (isAParty && (rawEventType.includes('connected') || rawEventType.includes('answered'))) {
                      // Logs removed for performance
                      // Keep current state but log progress
                    }
                  }
                }
              }
              return; // End of termination/answered processing
            }

            // Check if this is an incoming call event
            if (eventType === "incoming_call" && eventData.data) {
              // Logs removed for performance

              // Validate required call data
              const callData = eventData.data;
              // Cast to any to access _original which might be present but not in strict interface
              const originalData = (callData as any)._original || {};

              // Enhanced Call ID Extraction
              const callId =
                callData.CALL_ID ||
                callData.call_id ||
                originalData.callid ||
                originalData.CallId ||
                originalData.Call_Id ||
                originalData.Call_id || // Added based on logs
                originalData.uniqueid;

              const fromNumber =
                callData.A_PARTY_NO ||
                callData.aparty ||
                callData.from ||
                (callData as any)['a_party number'] ||
                (callData as any)['a_party_number'] ||
                originalData['a_party number'] ||
                originalData['a_party_number'] ||
                originalData.A_PARTY_NO ||
                originalData.aparty ||
                originalData.clid ||
                originalData.caller_id ||
                originalData.src ||
                originalData.from ||
                // Fallback to existing number if active call exists and this is an update
                incomingCallRef.current?.A_PARTY_NO ||
                incomingCallRef.current?.aparty;

              // Logs removed for performance

              const toNumber =
                callData.B_PARTY_NO || callData.bparty || callData.to || originalData.b_party_number || originalData.B_PARTY_NO;

              if (callId) {
                // Logs removed for performance

                // Check if the call is already disconnected
                // We must be careful: Provider sends contradictory signals during IVR-to-Agent transfer.
                // e.g., dial_status="A party Disconnected" but Aparty_status="Connected" and DTMF="1".

                const hasDtmf = !!(callData.DTMF || originalData.DTMF);
                const isConnectedStatus = originalData.Aparty_status === 'Connected' || originalData.status === 'Connected';

                // Check if this is a call log (call already ended) vs live call
                const callEndTime = originalData.Call_endtime || originalData.call_endtime;
                const hasCallEnded = callEndTime && callEndTime !== "0" && callEndTime !== "";

                if (hasCallEnded) {
                  // Logs removed for performance

                  // If we have an active popup for this ended call, clear it
                  const currentCall = incomingCallRef.current;
                  if (currentCall && (currentCall.CALL_ID === callId || currentCall.call_id === callId)) {
                    // Logs removed for performance
                    setIncomingCall(null);
                    toast.dismiss("incoming-call");
                  }

                  // Optional: Showing a toast for "Call ended" might be noisy if we already know it ended
                  // toast('ℹ️ Received call log (Call already ended)');
                  return;
                }

                // Check if this is an IVR routing event (agent call)
                const isIvrRoutingEvent =
                  callData.EVENT_TYPE === 'IVR_ROUTED' ||
                  callData.EVENT_TYPE === 'DTMF' ||
                  callData.EVENT_TYPE === 'IVR_MENU_SELECTION' ||
                  callData.source === 'ivr_routing';

                // Ignore "0 | Not Available" which is a default placeholder
                const rawReleaseReason = originalData.Release_reason || '';
                const isRealRelease = rawReleaseReason &&
                  rawReleaseReason !== "0 | Not Available" &&
                  rawReleaseReason !== "0";

                // More intelligent disconnect detection:
                // 1. If it's an IVR routing event (agent call), NEVER treat as disconnected
                // 2. If we have DTMF input, it means customer is interacting - NOT disconnected
                // 3. If status is explicitly "Connected", NOT disconnected
                // 4. Only treat as disconnected if we have REAL disconnect signals AND no active call indicators
                const isDisconnected =
                  !isIvrRoutingEvent && // NOT an agent routing event
                  !hasDtmf && // NO DTMF input
                  !isConnectedStatus && // NOT connected status
                  (
                    // AND has actual disconnect signals
                    (originalData.dial_status?.includes('Disconnected') && isRealRelease) ||
                    (originalData.Call_endtime && originalData.Call_endtime !== "0" && isRealRelease)
                  );

                if (isDisconnected) {
                  console.warn("⚠️ Received 'Incoming' event for an ENDED call. Ignoring popup.", originalData);
                  toast('ℹ️ Received call log (Call ended)');
                  return;
                }


                const isAdmin = agentData?.username === 'admin@example.com' ||
                  (agentPermissions && Object.keys(agentPermissions).includes('admin'));

                const cleanNumber = (num: string | undefined) => num?.replace(/\D/g, '').slice(-10);

                const targetNumber = cleanNumber(toNumber);

                // Enhanced Logic: Check specific Agent Number/ID fields from provider first
                // Provider sends "Agent_no" (without underscore at end) in _original
                const agentNumber = cleanNumber(
                  (callData as any).Agent_number ||
                  (callData as any).Agent_no ||  // Added: Provider sends this
                  (callData as any).Agent_ID ||
                  originalData.Agent_number ||
                  originalData.Agent_no ||  // Added: Provider sends this in _original
                  originalData.Agent_ID ||
                  originalData.Agent_in_flow
                );

                const myNumber = cleanNumber(agentData?.phone_number);
                const virtualNumber = cleanNumber(cliNumber);

                // Determine if this is an IVR call or direct call
                const isIvrCall =
                  callData.source === 'ivr_routing' ||
                  callData.EVENT_TYPE === 'IVR_ROUTED' ||
                  callData.EVENT_TYPE === 'DTMF' ||
                  callData.EVENT_TYPE === 'DTMF_INPUT' ||
                  callData.EVENT_TYPE === 'IVR_MENU_SELECTION';
                const callSource = isIvrCall ? 'IVR (Customer Selected Option)' : 'Direct Call';

                // --- IMPLICIT MATCHING FOR MISSING ID ---
                // If Call ID is missing but Agent Number matches me, and I have an active popup,
                // assume this is an update for MY current call.
                let finalCallId = callId;

                if (!finalCallId) {
                  const currentActiveCall = incomingCallRef.current;

                  // Check if the event is specifically a "Call Connected" event for my agent
                  const isConnectedEvent = originalData.Event_type === 'Call_connected' || originalData.Event_type === 'Agent_connected';
                  const isAgentMatch = agentNumber && agentNumber === myNumber;

                  if (currentActiveCall && (isAgentMatch || isConnectedEvent)) {
                    // Logs removed for performance
                    finalCallId = currentActiveCall.CALL_ID || currentActiveCall.call_id;
                  }
                }

                if (!finalCallId) {
                  // Logs removed for performance
                  // Do NOT show toast error to user, just ignore bad data
                  return;
                }
                // ----------------------------------------

                // Check if this event indicates connection
                const isConnectedUpdate =
                  originalData.Event_type === 'Call_connected' ||
                  originalData.Event_type === 'Agent_connected' ||
                  callData.status === 'Connected';

                const incomingCallData: IncomingCall = {
                  ...callData,
                  A_PARTY_NO: fromNumber || (incomingCallRef.current?.A_PARTY_NO), // Inherit from existing if missing in update
                  B_PARTY_NO: toNumber || (incomingCallRef.current?.B_PARTY_NO),
                  CALL_ID: finalCallId,
                  call_source: callSource,
                  is_ivr_call: isIvrCall,
                  timestamp: callData.timestamp || callData.CALL_START_TIME || originalData.time_stamp || originalData['Recieved call start time'] || new Date().toISOString(),
                  EVENT_TYPE: callData.EVENT_TYPE || originalData.event_type || originalData.Event_Type,
                  Agent_number: agentNumber,
                  // If this is a connected event, force status to connected
                  status: isConnectedUpdate ? 'Connected' : callData.status,
                  ...(originalData ? { _original: originalData } : {})
                };

                const isTargetingMyAgentNumber = agentNumber && agentNumber === myNumber;

                // Explicitly check for Agent ID/Username match (if provider sends IDs instead of numbers)
                const rawAgentId = (callData as any).Agent_ID || originalData.Agent_ID || (callData as any).agent_id;
                const myAgentId = String(agentData?.id || '');
                const myUsername = agentData?.username || '';

                const isTargetingMyAgentId = rawAgentId && (
                  String(rawAgentId) === myAgentId ||
                  String(rawAgentId).toLowerCase() === myUsername.toLowerCase()
                );

                const isImplicitMatch = incomingCallRef.current && (incomingCallRef.current.CALL_ID === finalCallId);

                // Check if the B-Party (Destination) is ME (Direct transfer to Agent Mobile)
                const isDirectCallToMe = targetNumber === myNumber;

                // Admin Logic: See ONLY unassigned calls (no Agent_number AND no Agent_ID)
                // Agent Logic: See assigned calls (Number OR ID) OR Direct calls OR Broadcasts (No Agent + Virtual Num)

                const isForMe =
                  (isAdmin && !agentNumber && !rawAgentId && !isTargetingMyAgentId) ||  // Admin sees ONLY unassigned calls
                  isTargetingMyAgentNumber ||    // Matched by Phone Number
                  isTargetingMyAgentId ||        // Matched by Agent ID/Username
                  isDirectCallToMe ||            // Matched by Destination (B-Party)
                  (!agentNumber && !rawAgentId && targetNumber === virtualNumber) || // Broadcast to CLI
                  isImplicitMatch;               // Update for active call

                // Debug log to help diagnose routing issues
                if (agentData?.username !== 'admin@example.com') {
                  // Logs removed for performance
                }

                const isCallAssignedToOtherAgent = (agentNumber || rawAgentId) && !isForMe && !isAdmin;

                // Logs removed for performance

                if (!isForMe) {
                  const currentCall = incomingCallRef.current;
                  if (currentCall && finalCallId && (currentCall.CALL_ID === finalCallId || currentCall.call_id === finalCallId)) {
                    // CAREFUL: If it's just a status update (like connected) and lacks numbers, don't route away!
                    if (!toNumber && isConnectedUpdate) {
                      // This is likely just an update for ME, keep it.
                      // Logs removed for performance
                    } else {
                      // Logs removed for performance
                      setIncomingCall(null);
                      toast.dismiss("incoming-call");
                      return;
                    }
                  } else {
                    return;
                  }
                }

                // Logs removed for performance
                setIncomingCall(incomingCallData);

                // Emit incoming call event to global listener
                voipEventBus.emit('incoming_call_received', incomingCallData);

                // Toast logic:
                // 1. If Connected, show success toast
                // 2. If New Call, show incoming toast
                if (isConnectedUpdate) {
                  toast.dismiss("incoming-call");
                  toast.success("Call Answered - Connected");
                } else {
                  const isNewCall = !incomingCallRef.current || (incomingCallRef.current.CALL_ID !== finalCallId);
                  if (isNewCall) {
                    toast.success(
                      `📞 ${callSource} from ${fromNumber || "Unknown"}`,
                      { duration: 10000, id: "incoming-call" }
                    );
                  }
                }
              }


            } else if (eventData.type) {
              // Logs removed for performance
            } else {
              // Logs removed for performance
            }
          } catch (parseError) {
            console.error("❌ Error parsing SSE event data:", parseError);
            console.error("Raw event data:", event.data);
            toast.error("Error processing incoming call data");
          }
        };

        eventSource.onerror = (error) => {
          console.error("❌ VoipControls: SSE connection error:", error);

          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Only attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const retryDelay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            ); // Exponential backoff, max 30s


            reconnectTimeout = setTimeout(() => {
              connectEventSource();
            }, retryDelay);
          } else {
            console.error(
              "❌ VoipControls: Max SSE reconnection attempts reached. Manual refresh may be required."
            );
            toast.error("Connection to server lost. Please refresh the page.", {
              duration: 0, // Persistent toast
              id: "sse-connection-failed",
            });
          }
        };

        // Health check: Reconnect if no messages received for too long
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
        }

        healthCheckInterval = setInterval(() => {
          const timeSinceLastMessage = Date.now() - lastMessageTime;

          if (timeSinceLastMessage > MAX_SILENCE_DURATION) {
            console.warn(`⚠️ VoipControls: No messages for ${timeSinceLastMessage}ms, reconnecting...`);

            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }

            // Reset reconnect attempts for health-check initiated reconnects
            reconnectAttempts = 0;
            connectEventSource();
          }
        }, HEALTH_CHECK_INTERVAL);

      } catch (error) {
        console.error("❌ VoipControls: Failed to create SSE connection:", error);

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          reconnectTimeout = setTimeout(() => {
            connectEventSource();
          }, 5000);
        }
      }
    };

    // Initial connection
    connectEventSource();

    // Cleanup function
    return () => {

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    };
  }, [agentData, agentPermissions, cliNumber]); // Proper dependencies - reconnect when these change

  const keypadButtons = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "*",
    "0",
    "#",
  ];

  const onKeypadClick = (char: string) => setBParty((prev) => prev + char);
  const onKeypadKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const allowed = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "*",
      "#",
      "Backspace",
      "Delete",
    ];
    if (!allowed.includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Backspace" || e.key === "Delete")
      setBParty((prev) => prev.slice(0, -1));
    else setBParty((prev) => prev + e.key);
  };

  // Helper function to log call events
  const logCallEvent = async (referenceId: string, status: string) => {
    try {
      await fetch("/api/callLogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId,
          cli: cliNumber,
          aParty,
          bParty,
          status,
        }),
      });
    } catch (error) {
      console.error("Failed to log call event:", error);
    }
  };

  const initiateCall = async () => {
    if (!token) {
      toast.error("Not authenticated yet");
      return;
    }

    // Check if agent has permission to make calls
    if (agentPermissions && !agentPermissions.canMakeCalls) {
      toast.error("You do not have permission to make calls");
      return;
    }

    if (!aParty || !bParty) {
      toast.error("Please enter dialed number");
      return;
    }

    const referenceId = `ref_${Date.now()}`;
    setCallStatus("Initiating call...");
    toast.loading("Initiating call...", { id: "call-action" });

    try {
      // Log call initiation
      await logCallEvent(referenceId, "initiated");

      const response = await callAPI(token, "initiate-call", {
        cli: cliNumber,
        apartyno: aParty,
        bpartyno: bParty,
        reference_id: referenceId,
        dtmfflag: 0,
        recordingflag: 0,
      });

      setCallStatus(JSON.stringify(response, null, 2));

      if (response.status === 1 && response.message?.callid) {
        const newCallId = response.message.callid.toString();
        setCallId(newCallId);
        setCurrentReferenceId(referenceId);
        setIsCalling(true);
        setIsCallEnded(false);
        setHoldStatus("");

        // Create outgoing call popup
        const outgoingCallData = {
          callId: newCallId,
          to: bParty,
          status: 'Ringing' as const,
          startTime: new Date().toISOString()
        };
        setOutgoingCall(outgoingCallData);

        // Emit event for global listener
        voipEventBus.emit('outgoing_call_initiated', outgoingCallData);

        // Outgoing call initiated. Status will be handled by SSE events.
        toast.dismiss("call-action");
        toast.success("Call Initiated");

        // Log successful call connection
        await logCallEvent(referenceId, "connected");

        toast.success("Call initiated successfully", { id: "call-action" });
      } else {
        // Log failed call
        await logCallEvent(referenceId, "failed");

        setCallStatus("Call initiation failed");
        toast.error("Call initiation failed", { id: "call-action" });
      }
    } catch (error) {
      console.error("Call initiation error:", error);
      setCallStatus("Call initiation failed");
      toast.error("Call initiation failed", { id: "call-action" });
    }
  };

  const disconnectCall = async () => {
    if (!token || !callId) {
      toast.error("No active call");
      return;
    }

    setCallStatus("Disconnecting call...");
    toast.loading("Disconnecting call...", { id: "call-action" });

    try {
      const response = await callAPI(token, "CallDisconnection", {
        cli: cliNumber,
        call_id: callId,
      });

      setCallStatus(JSON.stringify(response, null, 2));

      if (response.status === 1) {
        // Log call disconnection
        if (currentReferenceId) {
          await logCallEvent(currentReferenceId, "disconnected");
        }

        setIsCalling(false);
        setCallId(null);
        setCurrentReferenceId(null);
        setHoldStatus("");
        setIsCallEnded(true);

        // Update outgoing call popup to show ended status
        if (outgoingCall) {
          const endedCall = {
            ...outgoingCall,
            status: 'Ended' as const
          };
          setOutgoingCall(endedCall);
          voipEventBus.emit('outgoing_call_updated', endedCall);

          // Clear popup after 2 seconds
          setTimeout(() => {
            setOutgoingCall(null);
            voipEventBus.emit('outgoing_call_ended', null);
          }, 2000);
        }

        setCallStatus("Call disconnected by agent");
        toast.success("Call disconnected by agent", { id: "call-action" });
      } else if (response.status === 2) {
        // Log call ended by user
        if (currentReferenceId) {
          await logCallEvent(currentReferenceId, "ended_by_user");
        }

        setIsCalling(false);
        setCallId(null);
        setCurrentReferenceId(null);
        setHoldStatus("");
        setIsCallEnded(true);

        // Clear outgoing call popup
        setOutgoingCall(null);
        voipEventBus.emit('outgoing_call_ended', null);

        setCallStatus("Call ended by user");
        toast("Call was already ended by user", { id: "call-action" });
      } else {
        setCallStatus("Call disconnect failed: " + JSON.stringify(response));
        toast.error("Call disconnect failed", { id: "call-action" });
      }
    } catch (error) {
      console.error("Call disconnect error:", error);
      setCallStatus("Disconnect failed");
      toast.error("Disconnect failed", { id: "call-action" });
    }
  };

  const toggleHold = async () => {
    if (!token || !callId) {
      toast.error("No active call");
      return;
    }

    const holdOrResume = holdStatus === "hold" ? "0" : "1";
    const action =
      holdOrResume === "1" ? "Putting call on hold..." : "Resuming call...";
    setCallStatus(action);
    toast.loading(action, { id: "hold-action" });

    try {
      const response = await callAPI(token, "HoldorResume", {
        cli: cliNumber,
        call_id: callId,
        HoldorResume: holdOrResume,
      });

      if (response.status === 1) {
        setHoldStatus(holdOrResume === "1" ? "hold" : "resume");
        const successMessage = `Call ${holdOrResume === "1" ? "put on hold" : "resumed"
          } successfully`;

        // Log hold/resume action
        if (currentReferenceId) {
          await logCallEvent(
            currentReferenceId,
            holdOrResume === "1" ? "on_hold" : "resumed"
          );
        }

        setCallStatus(successMessage);
        toast.success(successMessage, { id: "hold-action" });
      } else if (response.status === 2) {
        // Log call ended
        if (currentReferenceId) {
          await logCallEvent(currentReferenceId, "ended_by_user");
        }

        setIsCalling(false);
        setCallId(null);
        setCurrentReferenceId(null);
        setHoldStatus("");
        setIsCallEnded(true);
        setCallStatus("Call already ended - cannot hold/resume");
        toast("Call already ended by user", { id: "hold-action" });
      } else {
        setCallStatus("Hold/Resume failed: " + JSON.stringify(response));
        toast.error("Hold/Resume failed", { id: "hold-action" });
      }
    } catch (error) {
      console.error("Hold/Resume error:", error);
      setCallStatus("Hold/Resume failed");
      toast.error("Hold/Resume failed", { id: "hold-action" });
    }
  };

  const startConference = async () => {
    if (!token || !callId) {
      toast.error("No active call");
      return;
    }

    // Check if agent has permission to start conference calls
    if (agentPermissions && !agentPermissions.canConferenceCalls) {
      toast.error("You do not have permission to start conference calls");
      return;
    }

    if (!conferenceNumber) {
      toast.error("Enter conference number");
      return;
    }

    setCallStatus("Starting conference...");
    toast.loading("Starting conference...", { id: "conference-action" });

    try {
      const response = await callAPI(token, "callConference", {
        cli: cliNumber,
        call_id: callId,
        cparty_number: conferenceNumber,
      });

      setCallStatus(JSON.stringify(response, null, 2));

      if (response.status === 1) {
        // Log conference started
        if (currentReferenceId) {
          await logCallEvent(currentReferenceId, "conference_started");
        }

        // Update outgoing call popup to show conference
        if (outgoingCall) {
          const conferenceCall = {
            ...outgoingCall,
            to: `Conference: ${conferenceNumber}`,
            status: 'Connected' as const
          };
          setOutgoingCall(conferenceCall);
          voipEventBus.emit('outgoing_call_updated', conferenceCall);
        }

        setConferenceNumber("");
        setCallStatus("Conference started successfully");
        toast.success("Conference started successfully", {
          id: "conference-action",
        });
      } else if (response.status === 2) {
        // Log call ended
        if (currentReferenceId) {
          await logCallEvent(currentReferenceId, "ended_by_user");
        }

        setIsCalling(false);
        setCallId(null);
        setCurrentReferenceId(null);
        setHoldStatus("");
        setIsCallEnded(true);
        setCallStatus("Call already ended - cannot start conference");
        toast("Call already ended by user", { id: "conference-action" });
      } else {
        setCallStatus("Conference failed: " + JSON.stringify(response));
        toast.error("Conference failed", { id: "conference-action" });
      }
    } catch (error) {
      console.error("Conference error:", error);
      setCallStatus("Conference failed");
      toast.error("Conference failed", { id: "conference-action" });
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    const callIdToAccept = incomingCall?.CALL_ID || incomingCall?.call_id;
    if (!token || !callIdToAccept) {
      toast.error("Missing token or call ID");
      console.error(
        "Accept call failed - Token:",
        !!token,
        "Call ID:",
        callIdToAccept,
        "Incoming call data:",
        incomingCall
      );
      return;
    }


    try {
      const res = await answerCall(token, callIdToAccept);

      if (res.status === 1) {
        // Log incoming call accepted
        const referenceId = `incoming_${Date.now()}`;
        await logCallEvent(referenceId, "incoming_accepted");

        setCurrentReferenceId(referenceId);
        setCallId(callIdToAccept);
        setIsCalling(true);
        setIsCallEnded(false);
        setHoldStatus("");

        // Set the B party as the caller's number
        const callerNumber =
          incomingCall?.A_PARTY_NO ||
          incomingCall?.aparty ||
          incomingCall?.from;
        if (callerNumber) {
          setBParty(callerNumber);
        }

        toast.success("Call accepted successfully", { id: "incoming-call" });
        setIncomingCall(null);
      } else {
        toast.error("Failed to accept call", { id: "incoming-call" });
        console.error("Accept call failed with response:", res);
      }
    } catch (error) {
      console.error("Error while accepting call:", error);
      toast.error("Error while accepting call", { id: "incoming-call" });
    }
  };

  // Reject incoming call
  const rejectCallHandler = async () => {
    const callIdToReject = incomingCall?.CALL_ID || incomingCall?.call_id;
    if (!token || !callIdToReject) {
      toast.error("Missing token or call ID");
      console.error(
        "Reject call failed - Token:",
        !!token,
        "Call ID:",
        callIdToReject,
        "Incoming call data:",
        incomingCall
      );
      return;
    }


    try {
      const res = await rejectCall(token, callIdToReject, cliNumber);

      if (res.status === 1) {
        // Log incoming call rejected
        const referenceId = `incoming_${Date.now()}`;
        await logCallEvent(referenceId, "incoming_rejected");

        toast.success("Call rejected", { id: "incoming-call" });
        setIncomingCall(null);
      } else {
        toast.error("Failed to reject call", { id: "incoming-call" });
        console.error("Reject call failed with response:", res);
      }
    } catch (error) {
      console.error("Error while rejecting call:", error);
      toast.error("Error while rejecting call", { id: "incoming-call" });
    }
  };

  return (
    <div className={styles.panelContainer}>
      <IncomingCallPopup
        incomingCall={incomingCall}
        cliNumber={cliNumber}
        onAccept={acceptCall}
        onReject={rejectCallHandler}
      />

      {/* Outgoing Call Popup */}
      {outgoingCall && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: outgoingCall.status === 'Ended' ? '#f44336' : outgoingCall.status === 'Connected' ? '#4CAF50' : '#2196F3',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10000,
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <i className={`fa-light ${outgoingCall.status === 'Ended' ? 'fa-phone-slash' :
              outgoingCall.status === 'Connected' ? 'fa-phone' :
                'fa-phone-arrow-up-right'
              }`} style={{ fontSize: '24px' }}></i>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {outgoingCall.status === 'Ended' ? 'Call Ended' :
                  outgoingCall.status === 'Connected' ? 'Call Connected' :
                    'Calling...'}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {outgoingCall.to}
              </div>
            </div>
          </div>
          {outgoingCall.status === 'Ringing' && (
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Ringing...
            </div>
          )}
        </div>
      )}

      <div className={styles.voipFlex}>
        {(!agentPermissions || agentPermissions.canMakeCalls) && (
          <div className={styles.section} style={{ flex: 1 }}>
            <h2 className={styles.cpaasHeading}>Initiate Call</h2>

            {/* Removed CLI selection UI - now handled in parent component */}

            <div className={styles.inputGroup}>
              <label className="pb-2">Selected DNI Number:</label>
              <input
                placeholder="CLI Number"
                value={cliNumber || "No CLI number selected"}
                readOnly
                className={styles.cliNumberInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className="pb-2">A Party Number:</label>
              <input
                placeholder="A Party Number"
                value={aParty}
                readOnly
                className={styles.cliNumberInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                placeholder="Dialed Number"
                value={bParty}
                onChange={(e) => setBParty(e.target.value)}
                className={styles.keypadInput}
                aria-label="Dialed number"
              />
            </div>

            <button
              className={styles.button}
              onClick={initiateCall}
              disabled={!token || !bParty || !cliNumber}
            >
              Start Call
            </button>

            {isCalling && (
              <>
                <div className={styles.controlsContainer}>
                  <button
                    className={`${styles.button} ${styles.buttonDanger}`}
                    onClick={disconnectCall}
                    disabled={isCallEnded}
                  >
                    Disconnect Call
                  </button>
                  {/* <button className={styles.button} onClick={toggleHold}>
                    {holdStatus === "hold" ? "Resume Call" : "Hold Call"}
                  </button> */}
                </div>

                {(!agentPermissions || agentPermissions.canConferenceCalls) && outgoingCall?.status === 'Connected' && (
                  <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
                    <input
                      placeholder="Conference Party Number"
                      value={conferenceNumber}
                      onChange={(e) => setConferenceNumber(e.target.value)}
                    />
                    <button
                      className={styles.button}
                      onClick={startConference}
                      style={{ marginTop: "0.5rem" }}
                    >
                      Start Conference
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(!agentPermissions || agentPermissions.canMakeCalls) && (
          <div className={styles.section}>
            <h2 className={styles.cpaasHeading}>Dial Pad</h2>
            <div
              tabIndex={0}
              onKeyDown={onKeypadKeyDown}
              className={styles.keypadContainer}
              aria-label="Dial pad"
            >
              {keypadButtons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => onKeypadClick(btn)}
                  className={styles.keypadButton}
                  type="button"
                  aria-label={`Dial ${btn}`}
                >
                  {btn}
                </button>
              ))}
              <button
                onClick={() => setBParty("")}
                className={styles.keypadClearButton}
                type="button"
                aria-label="Clear dialed number"
              >
                Clear Number
              </button>
            </div>
          </div>
        )}

      </div>
      <div>
        {(!agentPermissions || agentPermissions.canMakeCalls) && (
          <div className={styles.statusDisplay}>
            <strong>Call Status</strong>
            <div style={{ marginTop: '0.5rem' }}>
              <div className={styles.statusDisplay}>
                <strong>Status:</strong>
                <pre>{callStatus || 'Ready to make calls'}</pre>
              </div>

              <div className={styles.statusDisplay}>
                <strong>Call Info:</strong>
                <pre>Call ID: {callId || 'None'}</pre>
                <pre>Hold Status: {holdStatus || 'None'}</pre>
                <pre>Is Calling: {isCalling ? 'Yes' : 'No'}</pre>
              </div>
            </div>
          </div>
        )}

        <div className={styles.statusDisplay}>
          <strong>Status / Response:</strong>
          <pre>{callStatus || "No activity yet"}</pre>
        </div>

        <div className={styles.statusDisplay}>
          <strong>Debug Info:</strong>
          <pre>Call ID: {callId || "None"}</pre>
          <pre>Hold Status: {holdStatus || "None"}</pre>
          <pre>Is Calling: {isCalling ? "Yes" : "No"}</pre>
          <pre>Call Ended: {isCallEnded ? "Yes" : "No"}</pre>
          <pre>Has Incoming Call: {incomingCall ? "Yes" : "No"}</pre>
          <pre>Token: {token ? "Present" : "Missing"}</pre>
        </div>
      </div>
    </div>
  );
};

export default VoipControls;
