import { NextResponse } from 'next/server';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
      return NextResponse.json({ songs: [] });
    }

    const files = await readdir(uploadsDir);
    const songs = files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav')).map(f => ({
      name: f,
      url: `/uploads/${f}`
    }));

    return NextResponse.json({ songs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to read songs' }, { status: 500 });
  }
}
