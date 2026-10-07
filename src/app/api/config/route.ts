import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const dataFile = join(process.cwd(), 'data.json');

export async function GET() {
  try {
    if (!existsSync(dataFile)) {
      return NextResponse.json({ tiles: [] });
    }
    const data = await readFile(dataFile, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ tiles: [] });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await writeFile(dataFile, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
