import { getSessionFromRequest } from '@/app/lib/session';
import { supabase } from '@/app/lib/supabase';
// FIXED API for sending WhatsApp template messages - Added messaging_product
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {

    // Auth Check
    const sessionData = await getSessionFromRequest(req);
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await req.json();

    const {
      to,
      fromNumber,
      templateName,
      parameters = [],
      headerImage = null,
      buttons = [],
      language = "en"
    } = requestBody;

    // Validate required fields
    if (!to || !fromNumber || !templateName) {
      return NextResponse.json(
        { error: "Missing required fields: to, fromNumber, templateName" },
        { status: 400 }
      );
    }

    const cleanTo = to.startsWith('+') ? to.substring(1) : to;

    if (!/^\d{10,15}$/.test(cleanTo)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    let components = requestBody.components || [];

    // Fallback/Legacy logic ...
    if ((!components || components.length === 0) && (parameters || headerImage)) {
      if (headerImage) {
        components.push({ type: "header", parameters: [{ type: "image", image: { link: headerImage } }] });
      }
      if (parameters && parameters.length > 0) {
        const bodyParameters = parameters.map((param: string) => ({ type: "text", text: param.toString().trim() }));
        components.push({ type: "body", parameters: bodyParameters });
      }
    }

    const payload = {
      integrated_number: fromNumber,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: components
        }
      }
    };

    const response = await fetch(
      "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authkey: '424608A3Z7MMnI0Q68751e0dP1',
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON response" }, { status: 502 });
    }

    if (response.ok) {
      const messageId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Store buttons data in content as hidden JSON (temporary solution until metadata column is added)
      const contentWithButtons = buttons.length > 0
        ? `${requestBody.templateBody || `Template: ${templateName}`}\n<!--BUTTONS:${JSON.stringify(buttons)}-->`
        : requestBody.templateBody || `Template: ${templateName}`;

      const { error: insertError } = await supabase.from('messages').insert([{
        message_id: messageId,
        from_number: `+${fromNumber}`,
        to_number: `+${cleanTo}`,
        content: contentWithButtons,
        direction: 'OUT',
        read_status: true,
        delivery_status: 'delivered',
        media_type: 'template',
        media_url: headerImage || null,
        media_filename: headerImage ? 'template_header.jpg' : null
      }]);

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: "Template message sent successfully",
        template_info: {
          name: templateName
        },
        message_uuid: result.data?.message_uuid || null
      });
    } else {
      // Error logic
      return NextResponse.json({ error: result.message || "Failed", details: result }, { status: response.status });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}