
import { NextResponse } from 'next/server';
import { getPlatformLogo } from '@/app/lib/branding/logo';

export async function GET() {
    // Public endpoint to get the platform logo
    const logoUrl = await getPlatformLogo();

    // If it's a relative path starting with /, prepend current origin if needed, 
    // but usually <img src="/path"> works fine.
    // However, for Next Image optimization, we might need full URL or config.
    // The logo from upload is usually "/company-profile-icons/filename".

    return NextResponse.json({ logoUrl });
}
