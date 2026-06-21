import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/middleware';
import { setKey, deleteKey } from '@/lib/keychain';
import { eq, and } from 'drizzle-orm';

const PatchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')).nullable(),
  apiKey: z.string().min(1).optional(),
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = PatchSchema.parse(body);

    const db = getDb();
    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, Number(id)), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl || null;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    if (data.apiKey) {
      await deleteKey(provider.apiKeyRef);
      const newRef = `user-${user.id}-${provider.type}-${Date.now()}`;
      await setKey(newRef, data.apiKey);
      updateData.apiKeyRef = newRef;
    }

    const updated = db.update(schema.aiProviders)
      .set(updateData)
      .where(eq(schema.aiProviders.id, provider.id))
      .returning()
      .get();

    return NextResponse.json({ provider: { ...updated, apiKeyRef: undefined } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Patch provider error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, Number(id)), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteKey(provider.apiKeyRef);
    db.delete(schema.aiProviders).where(eq(schema.aiProviders.id, Number(id))).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}