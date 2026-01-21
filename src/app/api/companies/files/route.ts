import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { companyId, fileName, fileType, fileSize, fileContent, description } = data;

    if (!companyId || !fileName || !fileType || !fileSize || !fileContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }



    // Convert array back to Buffer
    const fileBuffer = Buffer.from(fileContent);

    // Save file to database
    const { data: fileData, error: insertError } = await supabase
      .from('company_files')
      .insert([
        {
          company_id: parseInt(companyId),
          file_name: fileName,
          file_path: 'blob', // Placeholder since we store in file_content
          file_url: 'blob', // Placeholder since we store in file_content
          file_content: fileBuffer,
          file_size: fileSize,
          file_type: fileType,
          description: description || null
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'File uploaded successfully', fileId: fileData.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch regular uploaded files
    const { data: files, error } = await supabase
      .from('company_files')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Fetch email attachments
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('id, subject, attachments, date, created_at')
      .eq('company_id', companyId)
      .not('attachments', 'is', null)
      .order('date', { ascending: false });

    // 3. Fetch WhatsApp media files
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('message_id, media_url, media_type, media_filename, media_caption, created_at')
      .eq('company_id', companyId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false });

    // 4. Combine all files
    const allFiles = [
      ...(files || []).map((f: any) => ({
        id: f.id,
        file_name: f.file_name,
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
        file_size: 0,
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
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}