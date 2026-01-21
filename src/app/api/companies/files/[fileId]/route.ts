import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get file content
    const { data: file, error } = await supabase
      .from('company_files')
      .select('file_name, file_type, file_content')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Process file content
    // Supabase returns bytea as hex string or buffer depending on version.
    // If it's a hex string (common in pg), we need to parse it.
    // However, supabase-js usually handles this. Let's try sending it directly.
    // If file_content comes as { type: 'Buffer', data: [...] }, handle that.

    let buffer: Buffer;
    if (file.file_content && (file.file_content as any).type === 'Buffer') {
      buffer = Buffer.from((file.file_content as any).data);
    } else if (typeof file.file_content === 'string') {
      // Hex string starting with \x
      buffer = Buffer.from(file.file_content.replace(/^\\x/, ''), 'hex');
    } else {
      buffer = Buffer.from(file.file_content);
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': file.file_type,
        'Content-Disposition': `attachment; filename="${file.file_name}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const { error } = await supabase
      .from('company_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;

    return NextResponse.json(
      { message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}