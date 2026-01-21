// src/app/api/hold-audio/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { supabase } from '@/app/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file info from database
    const { data: file, error: fetchError } = await supabase
      .from('hold_audio_files')
      .select('*')
      .eq('id', fileId)
      .eq('is_active', true)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const fullPath = path.join(process.cwd(), 'public', file.file_path);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }

    // Mark as inactive in database (soft delete)
    const { error: updateError } = await supabase
      .from('hold_audio_files')
      .update({ is_active: false })
      .eq('id', fileId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Audio file deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting audio file:', error);
    return NextResponse.json(
      { error: 'Failed to delete audio file' },
      { status: 500 }
    );
  }
}