// app/api/upload-media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side uploads (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // ✅ Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // ✅ Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type. Please select an image, video, audio, or document.',
        receivedType: file.type,
        allowedTypes: allowedTypes
      }, { status: 400 });
    }

    // ✅ Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;



    // ✅ Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // ✅ Upload to Supabase Storage using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('whatsapp-media')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return NextResponse.json({
        error: 'Failed to upload to Supabase Storage',
        details: error.message
      }, { status: 500 });
    }

    // ✅ Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('whatsapp-media')
      .getPublicUrl(filename);


    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('❌ Error uploading media:', error);
    return NextResponse.json({
      error: 'Failed to upload media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
