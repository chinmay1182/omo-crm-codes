import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    // Placeholder: Return empty list for now.
    // Future: Fetch messages from 'whatsapp_messages' table by phone number
    return NextResponse.json([], { status: 200 });
}
