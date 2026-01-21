// API for editing and deleting specific MSG91 WhatsApp templates
import { NextRequest, NextResponse } from 'next/server';

// Edit template
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateData = await req.json();
    const templateId = params.id;

    const response = await fetch(`https://control.msg91.com/api/v5/whatsapp/edit-template/${templateId}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'authkey': process.env.MSG91_API_KEY!,
        'content-type': 'application/json'
      },
      body: JSON.stringify(templateData)
    });

    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json({ error: 'Failed to edit template', details: result }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    const response = await fetch(`https://control.msg91.com/api/v5/whatsapp/delete-template/${templateId}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'authkey': process.env.MSG91_API_KEY!,
        'content-type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Template deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete template', details: result }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}