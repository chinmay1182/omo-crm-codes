import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const profileIconsPath = path.join(process.cwd(), 'public', 'profile-icons');

        // Check if directory exists
        if (!fs.existsSync(profileIconsPath)) {
            // Create directory if it doesn't exist to avoid errors
            try {
                fs.mkdirSync(profileIconsPath, { recursive: true });
            } catch (e) {
                console.error('Error creating profile-icons directory:', e);
                // If we can't create it (e.g. read-only fs), return empty list
                return NextResponse.json({ icons: [] });
            }
        }

        const files = fs.readdirSync(profileIconsPath);
        // Filter for image files
        const imageFiles = files.filter(file => /\.(png|jpe?g|svg|webp|gif)$/i.test(file));

        return NextResponse.json({ icons: imageFiles });
    } catch (error) {
        console.error('Error listing profile icons:', error);
        return NextResponse.json({ error: 'Failed to list icons' }, { status: 500 });
    }
}
