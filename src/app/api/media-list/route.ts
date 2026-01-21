import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    // List all files from Supabase Storage bucket
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .list('template-images', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('❌ Error listing files from Supabase:', error);
      return NextResponse.json({ files: [] });
    }

    // Generate public URLs for all files
    const urls = data
      .filter(file => file.name !== '.emptyFolderPlaceholder') // Skip placeholder files
      .map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('whatsapp-media')
          .getPublicUrl(`template-images/${file.name}`);
        return publicUrl;
      });


    return NextResponse.json({ files: urls });
  } catch (error) {
    console.error("Error reading media from Supabase:", error);
    return NextResponse.json({ files: [] });
  }
}
