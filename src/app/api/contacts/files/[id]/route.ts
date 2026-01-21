import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: file, error } = await supabase
      .from('contact_files')
      .select('file_name, file_type, file_content')
      .eq('id', id)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    let buffer: Buffer;
    if (file.file_content && (file.file_content as any).type === 'Buffer') {
      buffer = Buffer.from((file.file_content as any).data);
    } else if (typeof file.file_content === 'string') {
      buffer = Buffer.from(file.file_content.replace(/^\\x/, ''), 'hex');
    } else {
      buffer = Buffer.from(file.file_content);
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': file.file_type || 'application/octet-stream',
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('contact_files')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}