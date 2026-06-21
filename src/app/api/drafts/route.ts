import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, desc } from 'drizzle-orm';

const CreateSchema = z.object({
  categoryId: z.number().int().positive(),
  title: z.string().max(200).optional(),
  contentMd: z.string().optional(),
  platform: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDb();
    const drafts = db.select()
      .from(schema.drafts)
      .where(eq(schema.drafts.userId, user.id))
      .orderBy(desc(schema.drafts.updatedAt))
      .all();
    return NextResponse.json({ drafts });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = CreateSchema.parse(body);

    const db = getDb();
    const draft = db.insert(schema.drafts).values({
      userId: user.id,
      categoryId: data.categoryId,
      title: data.title,
      contentMd: data.contentMd,
      platform: data.platform,
      status: 'draft',
    }).returning().get();

    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}