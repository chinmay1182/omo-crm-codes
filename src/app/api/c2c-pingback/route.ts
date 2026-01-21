/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
// Import the SAME broadcast function so frontend receives events identically
import { sendEventToClients } from "../pingback/stream/route";

// Helper function to normalize call data (Same as main pingback)
function normalizeCallData(rawData: any) {
    const normalized = {
        // Call ID
        call_id: rawData.CALL_ID || rawData.call_id || rawData.id || rawData.uuid || rawData.call_uuid || rawData.session_id || rawData.sessionId || rawData.callid,
        CALL_ID: rawData.CALL_ID || rawData.call_id || rawData.id || rawData.uuid || rawData.call_uuid || rawData.session_id || rawData.sessionId || rawData.callid,

        // A Party (Caller - in C2C this is usually the Agent)
        A_PARTY_NO:
            rawData.A_PARTY_NO || rawData.aparty || rawData.from || rawData.caller || rawData.ani || rawData.caller_id || rawData.a_party_number,

        // B Party (Callee - in C2C this is the Customer)
        B_PARTY_NO:
            rawData.B_PARTY_NO || rawData.bparty || rawData.to || rawData.callee || rawData.dnis || rawData.did || rawData.b_party_number,

        // Timestamp
        CALL_START_TIME:
            rawData.CALL_START_TIME ||
            rawData.timestamp ||
            rawData.time_stamp ||
            rawData.created_at ||
            new Date().toISOString(),

        // Event type - CRITICAL for C2C
        EVENT_TYPE:
            rawData.EVENT_TYPE ||
            rawData.event_type ||
            rawData.type ||
            "OUTGOING_EVENT",

        // Preserve original data
        _original: rawData,
    };

    return normalized;
}

// Handler for POST requests (Preferred)
export async function POST(req: NextRequest) {
    try {

        // Parse Body
        const contentType = req.headers.get("content-type") || "unknown";
        let rawCallData: any;

        if (contentType.includes("application/json")) {
            rawCallData = await req.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await req.formData();
            rawCallData = Object.fromEntries(formData.entries());
        } else {
            rawCallData = await req.json(); // Fallback
        }


        const normalizedData = normalizeCallData(rawCallData);

        // Prepare SSE Event
        // We Map C2C events to standard types our frontend understands
        let sseType = "outgoing_event"; // Generic default

        const evt = normalizedData.EVENT_TYPE?.toUpperCase() || "";

        if (evt.includes("CONNECTED") || evt.includes("ANSWERED")) {
            sseType = "answered_call";
            // Note: Frontend logic for outgoing calls handles "answered_call" or status="Connected"
        } else if (evt.includes("END") || evt.includes("DISCONNECT") || evt.includes("HANGUP")) {
            sseType = "call_end";
        }

        const sseEventData = {
            type: sseType, // Frontend uses specific types, but also checks 'pingback'
            // We send 'pingback' type mainly, but let's stick to what we used in the main route 
            // or use 'call_status_update' if we want to be generic. 
            // Actually, looking at main route, it sends 'incoming_call', 'missed_call' etc.
            // But passing the raw type is also fine as our frontend parser handles it.

            // Let's pass the raw event type as the main type to ensure the frontend 
            // parser (which checks rawData.type) sees it.
            // BUT `sendEventToClients` takes { type: string, data: any ... }

            // We will send specific types that trigger the frontend logic:
            timestamp: new Date().toISOString(),
            data: normalizedData
        };

        // Override type for specific events to ensure frontend catches them
        if (sseType !== "outgoing_event") {
            sseEventData.type = sseType;
        } else {
            // If it's something like "A Party Dial Initiated", pass it as generic status
            sseEventData.type = "call_status_update";
        }


        // Broadcast to the SAME stream that VoipControls is listening to
        sendEventToClients(sseEventData);

        return NextResponse.json({ status: "success", received: true });
    } catch (error) {
        console.error("❌ Error in C2C Pingback:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Handler for GET requests (If provider uses GET)
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const rawCallData: any = {};
        searchParams.forEach((value, key) => { rawCallData[key] = value; });


        const normalizedData = normalizeCallData(rawCallData);

        // Logic duplicated from POST for simplicity
        let sseType = "call_status_update";
        const evt = normalizedData.EVENT_TYPE?.toUpperCase() || "";

        if (evt.includes("CONNECTED") || evt.includes("ANSWERED")) {
            sseType = "answered_call";
        } else if (evt.includes("END") || evt.includes("DISCONNECT") || evt.includes("HANGUP")) {
            sseType = "call_end";
        }

        const sseEventData = {
            type: sseType,
            timestamp: new Date().toISOString(),
            data: normalizedData
        };

        sendEventToClients(sseEventData);

        return NextResponse.json({ status: "success", received: true });
    } catch (error) {
        console.error("❌ Error in C2C GET Pingback:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
