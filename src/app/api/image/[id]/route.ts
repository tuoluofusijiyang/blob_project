import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    const img = db.select().from(schema.generatedImages)
      .where(and(eq(schema.generatedImages.id, Number(id)), eq(schema.generatedImages.userId, user.id)))
      .get();
    if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
    const filePath = join(dataDir, img.filePath);
    const buf = await readFile(filePath);

    return new Response(buf, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}