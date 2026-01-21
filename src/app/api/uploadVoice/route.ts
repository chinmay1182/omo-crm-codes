import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { supabase } from '@/app/lib/supabase';

const UPLOAD_URL = 'https://cts.myvi.in:8443/Cpaas/api/clicktocall/uploadvoice';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const saveToServer = formData.get('saveToServer') === 'true'; // Optional flag

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let savedFile = null;

    // Save to server if requested
    if (saveToServer) {
      try {
        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'hold-audio');
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(file.name);
        const filename = `hold-audio-${timestamp}${fileExtension}`;
        const filepath = path.join(uploadDir, filename);
        const relativePath = `/hold-audio/${filename}`;

        // Save file to filesystem
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Save file metadata to database
        const { data: insertResult, error } = await supabase
          .from('hold_audio_files')
          .insert({
            name: file.name.replace(fileExtension, ''),
            original_filename: file.name,
            file_path: relativePath,
            file_size: file.size,
            mime_type: file.type,
            // created_at defaults to now()
          })
          .select()
          .single();

        if (error) throw error;

        savedFile = {
          id: insertResult.id,
          name: file.name.replace(fileExtension, ''),
          original_filename: file.name,
          file_path: relativePath,
          file_size: file.size,
          mime_type: file.type,
          url: relativePath
        };
      } catch (error) {
        console.error('Error saving to server:', error);
        // Continue with API upload even if server save fails
      }
    }

    // Upload to external API
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
    });

    const data = await response.json();

    // Return combined response
    return NextResponse.json({
      ...data,
      savedFile: savedFile // Include saved file info if available
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}