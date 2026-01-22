
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const imagesDirectory = path.join(process.cwd(), 'public/company-profile-icons');

    if (!fs.existsSync(imagesDirectory)) {
        return NextResponse.json({ icons: [] });
    }

    const filenames = fs.readdirSync(imagesDirectory);
    const icons = filenames.filter((file) => /\.(svg|png|jpg|jpeg|gif)$/i.test(file));

    return NextResponse.json({ icons });
}
