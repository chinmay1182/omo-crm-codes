import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Sanitize filename
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
        const filename = `${timestamp}-${originalName}`;

        const profileIconsPath = path.join(process.cwd(), 'public', 'profile-icons');

        if (!fs.existsSync(profileIconsPath)) {
            fs.mkdirSync(profileIconsPath, { recursive: true });
        }

        const filePath = path.join(profileIconsPath, filename);
        await writeFile(filePath, buffer);

        return NextResponse.json({ success: true, filename });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
