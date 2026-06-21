import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';

const PatchSchema = z.object({
  displayName: z.string().max(200).optional(),
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = PatchSchema.parse(body);

    const db = getDb();

    // 验证 model 属于当前用户
    const model = db.select().from(schema.aiModels)
      .where(eq(schema.aiModels.id, Number(id)))
      .get();
    if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, model.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const updated = db.update(schema.aiModels)
      .set(data)
      .where(eq(schema.aiModels.id, Number(id)))
      .returning()
      .get();

    return NextResponse.json({ model: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const model = db.select().from(schema.aiModels)
      .where(eq(schema.aiModels.id, Number(id)))
      .get();
    if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, model.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    db.delete(schema.aiModels).where(eq(schema.aiModels.id, Number(id))).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}