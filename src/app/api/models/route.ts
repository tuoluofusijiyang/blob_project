import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';

const CreateSchema = z.object({
  providerId: z.number().int().positive(),
  modelId: z.string().min(1).max(200),
  displayName: z.string().max(200).optional(),
  type: z.enum(['text', 'image']),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = CreateSchema.parse(body);

    const db = getDb();
    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, data.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Provider 不存在' }, { status: 404 });

    const model = db.insert(schema.aiModels).values({
      providerId: data.providerId,
      modelId: data.modelId,
      type: data.type,
      displayName: data.displayName || data.modelId,
    }).returning().get();

    return NextResponse.json({ model });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Create model error:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}