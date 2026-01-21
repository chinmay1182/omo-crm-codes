/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { sendEventToClients } from "./stream/route";

// Helper function to normalize call data from different providers
function normalizeCallData(rawData: any) {
  const normalized = {
    // Call ID
    call_id: rawData.CALL_ID || rawData.call_id || rawData.id || rawData.uuid || rawData.call_uuid || rawData.session_id || rawData.sessionId || rawData.callid,
    CALL_ID: rawData.CALL_ID || rawData.call_id || rawData.id || rawData.uuid || rawData.call_uuid || rawData.session_id || rawData.sessionId || rawData.callid,

    // A Party (caller)
    A_PARTY_NO:
      rawData.A_PARTY_NO || rawData.aparty || rawData.from || rawData.caller || rawData.ani || rawData.caller_id || rawData.a_party_number || rawData['a_party number'],
    aparty:
      rawData.A_PARTY_NO || rawData.aparty || rawData.from || rawData.caller || rawData.ani || rawData.caller_id || rawData.a_party_number || rawData['a_party number'],
    from:
      rawData.A_PARTY_NO || rawData.aparty || rawData.from || rawData.caller || rawData.ani || rawData.caller_id || rawData.a_party_number || rawData['a_party number'],

    // B Party (callee)
    B_PARTY_NO:
      rawData.B_PARTY_NO || rawData.bparty || rawData.to || rawData.callee || rawData.dnis || rawData.did || rawData.b_party_number || rawData.B_party_status,
    bparty:
      rawData.B_PARTY_NO || rawData.bparty || rawData.to || rawData.callee || rawData.dnis || rawData.did || rawData.b_party_number || rawData.B_party_status,
    to: rawData.B_PARTY_NO || rawData.bparty || rawData.to || rawData.callee || rawData.dnis || rawData.did || rawData.b_party_number || rawData.B_party_status,

    // Timestamp
    CALL_START_TIME:
      rawData.CALL_START_TIME ||
      rawData.timestamp ||
      rawData.time_stamp ||
      rawData.call_time ||
      rawData.created_at ||
      rawData.Dial_start_time ||
      new Date().toISOString(),
    timestamp:
      rawData.CALL_START_TIME ||
      rawData.timestamp ||
      rawData.time_stamp ||
      rawData.call_time ||
      rawData.created_at ||
      new Date().toISOString(),

    // Event type
    EVENT_TYPE:
      rawData.EVENT_TYPE ||
      rawData.event_type ||
      rawData.type ||
      "INCOMING_CALL",

    // DTMF/Input info
    DTMF: rawData.DTMF || rawData.dtmf || rawData.digits || rawData.key,

    // Agent Info
    Agent_number: rawData.Agent_number || rawData.Agent_ID || rawData.agent_number || rawData.agent_id || rawData.Agent_in_flow || rawData['AGENT NUMBER'] || rawData['$Last_Connected_Agent'] || rawData.Agent_no,

    // Preserve original data
    _original: rawData,
  };

  return normalized;
}

// Helper function to validate incoming call data
function validateCallData(callData: any) {
  const errors: string[] = [];

  if (!callData.call_id && !callData.CALL_ID) {
    errors.push("Missing required field: call_id");
  }

  if (!callData.A_PARTY_NO && !callData.aparty && !callData.from) {
    errors.push("Missing caller information (A_PARTY_NO/aparty/from)");
  }

  if (!callData.B_PARTY_NO && !callData.bparty && !callData.to) {
    errors.push("Missing callee information (B_PARTY_NO/bparty/to)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ================= GET =================


// ================= POST =================
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Extract Query Parameters
    const searchParams = req.nextUrl.searchParams;
    const rawCallData: any = {};

    searchParams.forEach((value, key) => {
      rawCallData[key] = value;
    });



    // 2. Reuse the same logic as POST (Normalizing & processing)
    const normalizedCallData = normalizeCallData(rawCallData);
    const validation = validateCallData(normalizedCallData);

    const eventType = normalizedCallData.EVENT_TYPE?.toUpperCase() || "INCOMING_CALL";

    // Check if this is a call log (call already ended) vs live call
    const callEndTime = rawCallData.Call_endtime || rawCallData.call_endtime;
    const hasCallEndTime = callEndTime && callEndTime !== "0" && callEndTime !== "";

    // Check for disconnect indicators
    const isDisconnected =
      rawCallData.dial_status?.includes("Disconnected") ||
      rawCallData.Disconnected_party ||
      eventType === "DISCONNECTED";

    let isRealtimeEvent = true;
    const eventReceivedTime = new Date();
    const callStartTimeStr = normalizedCallData.CALL_START_TIME || normalizedCallData.timestamp;

    if (callStartTimeStr) {
      try {
        const callStartDate = new Date(callStartTimeStr);
        const timeDiffSeconds = (eventReceivedTime.getTime() - callStartDate.getTime()) / 1000;
        isRealtimeEvent = timeDiffSeconds <= 60;
      } catch (e) {
        console.warn("Could not parse time", e);
      }
    }

    const isCallLog = hasCallEndTime && !isRealtimeEvent && isDisconnected;

    let sseEventData: any = {
      type: "incoming_call",
      timestamp: new Date().toISOString(),
      data: normalizedCallData,
      validation,
      processingTime: Date.now() - startTime,
    };

    // Determine valid disconnection state
    // We treat ANY event with a Call_endtime as a completed/ended call.
    // This is crucial because sometimes providers send "Incoming" type events but include end time
    // which effectively means the call is over.

    if (hasCallEndTime) {
      sseEventData.type = "missed_call"; // Or "call_ended", but frontend handles missed_call for now
    } else if (eventType === "DISCONNECTED") {
      sseEventData.type = "missed_call";
    } else if (eventType === "ANSWERED") {
      sseEventData.type = "answered_call";
    }

    // Live Popup Priority: If "DTMF" is present or we have a callID without EndTime, treat as incoming!
    if (normalizedCallData.DTMF || (!hasCallEndTime && normalizedCallData.call_id)) {
      sseEventData.type = "incoming_call";
    }

    // Send to Client
    try {
      sendEventToClients(sseEventData);
    } catch (broadcastError) {
    }

    // Return simple success for the Provider
    return NextResponse.json({ status: "success", received: true });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();


  try {
    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/pingback`;


    const contentType = req.headers.get("content-type") || "unknown";
    let rawCallData: any;

    if (contentType.includes("application/json")) {
      rawCallData = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      rawCallData = Object.fromEntries(formData.entries());
    } else if (contentType.includes("text/plain")) {
      const textData = await req.text();
      try {
        rawCallData = JSON.parse(textData);
      } catch {
        rawCallData = { raw_text: textData };
      }
    } else {
      rawCallData = await req.json(); // Default
    }

    const normalizedCallData = normalizeCallData(rawCallData);
    const validation = validateCallData(normalizedCallData);


    const eventType =
      normalizedCallData.EVENT_TYPE?.toUpperCase() || "INCOMING_CALL";


    // Check if this is a call log (call already ended) vs live call
    const callEndTime = rawCallData.Call_endtime || rawCallData.call_endtime;
    const hasCallEndTime = callEndTime && callEndTime !== "0" && callEndTime !== "";

    // Check for disconnect indicators
    const isDisconnected =
      rawCallData.dial_status?.includes("Disconnected") ||
      rawCallData.Disconnected_party ||
      eventType === "DISCONNECTED";

    // Determine if this is a real-time event based on call start time
    let isRealtimeEvent = true; // Default to true if no start time or parsing issues
    const eventReceivedTime = new Date();
    const callStartTimeStr = normalizedCallData.CALL_START_TIME || normalizedCallData.timestamp;

    if (callStartTimeStr) {
      try {
        const callStartDate = new Date(callStartTimeStr);
        const timeDiffSeconds = (eventReceivedTime.getTime() - callStartDate.getTime()) / 1000;

        // If event received within 60 seconds of call start, treat as real-time
        // This is a workaround since provider sends events after call ends
        isRealtimeEvent = timeDiffSeconds <= 60;

      } catch (e) {
      }
    }

    // Determine if this is a call log:
    // - Has end time AND
    // - NOT a real-time event AND
    // - Has disconnect indicators
    const isCallLog = hasCallEndTime && !isRealtimeEvent && isDisconnected;



    let sseEventData: any = {
      type: "incoming_call",
      timestamp: new Date().toISOString(),
      data: normalizedCallData,
      validation,
      processingTime: Date.now() - startTime,
    };

    // Classify event type based on call status
    // Determine valid disconnection state
    // We treat ANY event with a Call_endtime as a completed/ended call.
    if (hasCallEndTime) {
      sseEventData.type = "missed_call";
    } else if (eventType === "DISCONNECTED") {
      sseEventData.type = "missed_call";
    } else if (eventType === "ANSWERED") {
      sseEventData.type = "answered_call";
    } else if (eventType === "IVR_TIMEOUT" || eventType === "IVR_HANGUP") {
      sseEventData.type = "ivr_missed_call";
    } else if (eventType === "IVR_ROUTED" || eventType === "DTMF" || eventType === "IVR_MENU_SELECTION") {
      sseEventData.type = "incoming_call";
    }



    try {
      const { supabase } = await import("@/app/lib/supabase");

      // 1. Store in call_logs (General History)
      const callLogData = {
        reference_id: normalizedCallData.call_id,
        cli: normalizedCallData.B_PARTY_NO || normalizedCallData.bparty || normalizedCallData.to, // Assuming B-party is our CLI for incoming
        a_party: normalizedCallData.A_PARTY_NO || normalizedCallData.aparty || normalizedCallData.from,
        b_party: normalizedCallData.B_PARTY_NO || normalizedCallData.bparty || normalizedCallData.to,
        status: sseEventData.type, // e.g. incoming_call, answered_call, missed_call
        updated_at: new Date().toISOString()
      };

      const { error: logError } = await supabase
        .from('call_logs')
        .upsert(callLogData, { onConflict: 'reference_id' });

      if (logError) {
        console.error("❌ Error storing call log:", logError);
      } else {
      }

      // 2. Store in missed_calls (Specific Missed Call Logic)
      if (
        sseEventData.type === "missed_call" ||
        sseEventData.type === "ivr_missed_call"
      ) {
        const upsertData = {
          call_id: normalizedCallData.call_id,
          caller_number: normalizedCallData.A_PARTY_NO ||
            normalizedCallData.aparty ||
            normalizedCallData.from,
          callee_number: normalizedCallData.B_PARTY_NO ||
            normalizedCallData.bparty ||
            normalizedCallData.to,
          call_time: normalizedCallData.CALL_START_TIME || normalizedCallData.timestamp,
          status: sseEventData.type === "ivr_missed_call" ? "ivr_missed" : "missed",
          missed_reason: sseEventData.type === "ivr_missed_call"
            ? "ivr_timeout_or_hangup"
            : "external_disconnect",
          call_source: "Webhook",
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('missed_calls')
          .upsert(upsertData, { onConflict: 'call_id' });

        if (error) {
        } else {
        }
      }
    } catch (dbError) {
    }


    try {
      sendEventToClients(sseEventData);
    } catch (broadcastError) {
    }

    const response = {
      status: "received",
      eventType: sseEventData.type,
      callId: normalizedCallData.call_id,
      timestamp: new Date().toISOString(),
    };



    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ================= OPTIONS =================
export async function OPTIONS(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://crm.consolegal.com';
  const publicUrl = `${baseUrl}/api/pingback`;



  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}
