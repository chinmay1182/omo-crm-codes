// API for sending interactive WhatsApp list messages
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      to, 
      fromNumber, 
      header, 
      body, 
      footer, 
      buttonText, 
      sections 
    } = await req.json();

    const payload = {
      recipient_number: to,
      integrated_number: fromNumber,
      content_type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: header
        },
        body: {
          text: body
        },
        footer: {
          text: footer
        },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    };

    const response = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authkey': process.env.MSG91_API_KEY!,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json({ error: 'Failed to send', details: result }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}