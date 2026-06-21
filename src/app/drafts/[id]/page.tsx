import { AppShell } from '@/components/layout/app-shell';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { DraftEditor } from '@/components/draft/draft-editor';
import { readFile } from 'fs/promises';
import { join } from 'path';

export default async function DraftDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ platform?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { platform } = await searchParams;

  const db = getDb();
  const draft = db.select().from(schema.drafts)
    .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
    .get();
  if (!draft) notFound();

  const draftImages = db.select().from(schema.draftImages)
    .where(eq(schema.draftImages.draftId, draft.id))
    .all();

  const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
  const images = await Promise.all(draftImages.map(async (di) => {
    const img = db.select().from(schema.generatedImages)
      .where(eq(schema.generatedImages.id, di.imageId))
      .get();
    if (!img) return null;
    try {
      const buf = await readFile(join(dataDir, img.filePath));
      const base64 = buf.toString('base64');
      return {
        id: img.id,
        url: `data:image/png;base64,${base64}`,
        prompt: img.prompt || '',
        caption: di.caption || '',
      };
    } catch {
      return null;
    }
  })).then((arr) => arr.filter(Boolean) as any[]);

  const platforms = db.select().from(schema.platformFormats).all();

  const cover = draft.coverImageId
    ? db.select().from(schema.generatedImages)
        .where(eq(schema.generatedImages.id, draft.coverImageId)).get() || null
    : null;

  const initialCover = cover
    ? { id: cover.id, prompt: cover.prompt || '', width: cover.width, height: cover.height }
    : null;

  return (
    <AppShell>
      <DraftEditor
        draft={draft}
        images={images}
        platforms={platforms}
        initialPlatform={platform || draft.platform || 'markdown'}
        initialCover={initialCover}
      />
    </AppShell>
  );
}