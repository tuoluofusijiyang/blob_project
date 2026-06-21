import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { ADAPTERS } from '@/lib/format/adapters';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { platform } = await req.json();

    const db = getDb();
    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const adapter = ADAPTERS[platform];
    if (!adapter) return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });

    const draftImages = db.select().from(schema.draftImages)
      .where(eq(schema.draftImages.draftId, draft.id))
      .all();
    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');

    const images = await Promise.all(draftImages.map(async (di) => {
      const img = db.select().from(schema.generatedImages)
        .where(eq(schema.generatedImages.id, di.imageId))
        .get();
      if (!img) return null;
      const filePath = join(dataDir, img.filePath);
      try {
        const buf = await readFile(filePath);
        const base64 = buf.toString('base64');
        return {
          id: img.id,
          url: `data:image/png;base64,${base64}`,
          alt: img.prompt || '',
          caption: di.caption || undefined,
          width: img.width || 800,
          height: img.height || 600,
        };
      } catch {
        return null;
      }
    })).then((arr) => arr.filter(Boolean) as any[]);

    const formatted = await adapter.format({
      title: draft.title || '无标题',
      markdown: draft.contentMd || '',
      images,
      metadata: { author: user.displayName || user.username },
    });

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}