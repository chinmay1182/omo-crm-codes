import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch regular uploaded files
    const { data: files, error } = await supabase
      .from('contact_files')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Fetch email attachments
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('id, subject, attachments, date, created_at')
      .eq('contact_id', contactId)
      .not('attachments', 'is', null)
      .order('date', { ascending: false });

    // 3. Fetch WhatsApp media files
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('message_id, media_url, media_type, media_filename, media_caption, created_at')
      .eq('contact_id', contactId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false });

    // 4. Combine all files
    const allFiles = [
      ...(files || []).map((f: any) => ({
        id: f.id,
        file_name: f.file_name || f.filename,
        file_type: f.file_type,
        file_size: f.file_size,
        description: f.description,
        created_at: f.created_at,
        source: 'upload'
      })),
      // Email attachments
      ...(emails || []).flatMap((e: any) => {
        try {
          const attachments = typeof e.attachments === 'string'
            ? JSON.parse(e.attachments)
            : e.attachments;

          if (Array.isArray(attachments)) {
            return attachments.map((att: any, idx: number) => ({
              id: `email-${e.id}-${idx}`,
              file_name: att.filename || att.name || 'attachment',
              file_type: att.contentType || att.type || 'application/octet-stream',
              file_size: att.size || 0,
              description: `Email attachment from: ${e.subject || '(No subject)'}`,
              created_at: e.date || e.created_at,
              source: 'email',
              download_url: att.url || att.path
            }));
          }
        } catch (err) {
          console.error('Error parsing email attachments:', err);
        }
        return [];
      }),
      // WhatsApp media files
      ...(messages || []).map((m: any) => ({
        id: `whatsapp-${m.message_id}`,
        file_name: m.media_filename || `WhatsApp ${m.media_type || 'file'}`,
        file_type: m.media_type || 'unknown',
        file_size: 0, // Size not available for WhatsApp media
        description: m.media_caption || `WhatsApp ${m.media_type || 'media'}`,
        created_at: m.created_at,
        source: 'whatsapp',
        download_url: m.media_url
      }))
    ];

    // 5. Sort by date
    allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(allFiles);
  } catch (error) {
    console.error('Error fetching contact files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Assuming FileUpload sends casing like: { contactId, fileName, fileType, fileSize, fileContent, description }
    // But check older logic: it expected { contactId, filename, file_path, ... }
    // We update it to handle the payload FileUpload actually sends.
    const { contactId, fileName, fileType, fileSize, fileContent, description } = data;

    if (!contactId || !fileName || !fileContent) {
      return NextResponse.json(
        { error: 'Contact ID, filename, and content are required' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(fileContent);

    const { data: file, error: fileError } = await supabase
      .from('contact_files')
      .insert({
        contact_id: parseInt(contactId),
        file_name: fileName,
        file_path: 'blob', // Placeholder since we store in file_content
        file_url: 'blob', // Placeholder since we store in file_content
        file_content: fileBuffer,
        file_size: fileSize || 0,
        file_type: fileType || 'application/octet-stream',
        description: description || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (fileError) throw fileError;

    return NextResponse.json({
      success: true,
      id: file.id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading contact file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}