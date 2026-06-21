import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';

const UpdateSchema = z.object({
  title: z.string().max(200).optional(),
  contentMd: z.string().optional(),
  contentHtml: z.string().optional(),
  platform: z.string().optional(),
  status: z.enum(['draft', 'finalized', 'archived']).optional(),
  coverImageId: z.number().int().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const images = db.select().from(schema.draftImages)
      .where(eq(schema.draftImages.draftId, draft.id))
      .all();

    return NextResponse.json({ draft, images });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const db = getDb();
    const existing = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .get();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 保存版本快照
    if (data.contentMd && data.contentMd !== existing.contentMd) {
      const versions = db.select().from(schema.draftVersions)
        .where(eq(schema.draftVersions.draftId, existing.id))
        .orderBy(schema.draftVersions.versionNumber)
        .all();
      const nextVersion = (versions[versions.length - 1]?.versionNumber || 0) + 1;
      db.insert(schema.draftVersions).values({
        draftId: existing.id,
        versionNumber: nextVersion,
        contentMd: existing.contentMd || '',
        contentHtml: existing.contentHtml,
      }).run();
      // 只保留最近 5 个版本
      if (versions.length >= 5) {
        const oldIds = versions.slice(0, versions.length - 4).map((v) => v.id);
        for (const oldId of oldIds) {
          db.delete(schema.draftVersions).where(eq(schema.draftVersions.id, oldId)).run();
        }
      }
    }

    const updated = db.update(schema.drafts)
      .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.drafts.id, existing.id))
      .returning()
      .get();

    return NextResponse.json({ draft: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    const result = db.delete(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .returning()
      .get();
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}