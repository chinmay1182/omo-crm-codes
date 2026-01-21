// src/app/api/hold-audio/list/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data: audioFiles, error } = await supabase
      .from('hold_audio_files')
      .select(`
        id,
        name,
        original_filename,
        file_path,
        file_size,
        mime_type,
        duration,
        created_at,
        is_active
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add full URL for frontend use
    const filesWithUrls = (audioFiles || []).map(file => ({
      ...file,
      url: file.file_path,
      size_formatted: formatFileSize(file.file_size)
    }));

    return NextResponse.json({
      success: true,
      files: filesWithUrls
    });

  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio files' },
      { status: 500 }
    );
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}