import { NextResponse } from 'next/server';
import { rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const { oldName, newName } = await request.json();
    if (!oldName || !newName) return NextResponse.json({ error: 'Missing names' }, { status: 400 });

    const safeNewName = newName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (!safeNewName.endsWith('.mp3') && !safeNewName.endsWith('.wav')) {
      return NextResponse.json({ error: 'Invalid extension' }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const oldPath = join(uploadsDir, oldName);
    const newPath = join(uploadsDir, safeNewName);

    if (!existsSync(oldPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await rename(oldPath, newPath);
    return NextResponse.json({ success: true, newName: safeNewName, newUrl: `/uploads/${safeNewName}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}
