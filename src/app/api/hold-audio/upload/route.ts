// src/app/api/hold-audio/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 50MB allowed.' },
        { status: 400 }
      );
    }

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
        // created_at is default now()
      })
      .select()
      .single();

    if (error) throw error;

    const audioFile = {
      id: insertResult.id,
      name: file.name.replace(fileExtension, ''),
      original_filename: file.name,
      file_path: relativePath,
      file_size: file.size,
      mime_type: file.type,
      url: relativePath // For frontend use
    };

    return NextResponse.json({
      success: true,
      message: 'Audio file uploaded successfully',
      file: audioFile
    });

  } catch (error) {
    console.error('Error uploading audio file:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio file' },
      { status: 500 }
    );
  }
}