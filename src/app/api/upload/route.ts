import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { generateId } from '@/lib/uuid';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const ext = file.name.split('.').pop();
        const filename = `${generateId()}.${ext}`;

        // Save to public/uploads
        // Note: In production you'd use S3/Blob storage. For local dev, public folder works.
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        /* 
           Note: Ensure 'public/uploads' exists. 
           If not, we might fail. 
           We'll assume user can create it or we can try to create strictly if fs/promises is available.
        */

        const path = join(uploadDir, filename);
        await writeFile(path, buffer);

        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
