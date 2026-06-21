import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';

const PatchSchema = z.object({
  defaultTextProviderId: z.number().int().nullable().optional(),
  defaultTextModelId: z.number().int().nullable().optional(),
  defaultImageProviderId: z.number().int().nullable().optional(),
  defaultImageModelId: z.number().int().nullable().optional(),
  defaultPlatform: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
});

async function ensureOwnedModel(userId: number, modelId: number | null | undefined) {
  if (modelId == null) return true;
  const db = getDb();
  const m = db.select().from(schema.aiModels).where(eq(schema.aiModels.id, modelId)).get();
  if (!m) return false;
  const p = db.select().from(schema.aiProviders)
    .where(and(eq(schema.aiProviders.id, m.providerId), eq(schema.aiProviders.userId, userId)))
    .get();
  return !!p;
}

async function ensureOwnedProvider(userId: number, providerId: number | null | undefined) {
  if (providerId == null) return true;
  const db = getDb();
  const p = db.select().from(schema.aiProviders)
    .where(and(eq(schema.aiProviders.id, providerId), eq(schema.aiProviders.userId, userId)))
    .get();
  return !!p;
}

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDb();
    let row = db.select().from(schema.userSettings)
      .where(eq(schema.userSettings.userId, user.id)).get();
    if (!row) {
      db.insert(schema.userSettings).values({ userId: user.id }).run();
      row = db.select().from(schema.userSettings)
        .where(eq(schema.userSettings.userId, user.id)).get();
    }
    return NextResponse.json({ settings: row });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = PatchSchema.parse(body);

    if (!(await ensureOwnedProvider(user.id, data.defaultTextProviderId))
      || !(await ensureOwnedProvider(user.id, data.defaultImageProviderId))
      || !(await ensureOwnedModel(user.id, data.defaultTextModelId))
      || !(await ensureOwnedModel(user.id, data.defaultImageModelId))) {
      return NextResponse.json({ error: 'Provider 或 Model 不属于当前用户' }, { status: 403 });
    }

    const db = getDb();
    const existing = db.select().from(schema.userSettings)
      .where(eq(schema.userSettings.userId, user.id)).get();

    const patch: Record<string, unknown> = {};
    if ('defaultTextProviderId' in data) patch.defaultTextProviderId = data.defaultTextProviderId ?? null;
    if ('defaultTextModelId' in data) patch.defaultTextModelId = data.defaultTextModelId ?? null;
    if ('defaultImageProviderId' in data) patch.defaultImageProviderId = data.defaultImageProviderId ?? null;
    if ('defaultImageModelId' in data) patch.defaultImageModelId = data.defaultImageModelId ?? null;
    if ('defaultPlatform' in data) patch.defaultPlatform = data.defaultPlatform ?? null;
    if ('theme' in data) patch.theme = data.theme ?? 'system';
    if ('language' in data) patch.language = data.language ?? 'zh-CN';

    if (existing) {
      db.update(schema.userSettings).set(patch)
        .where(eq(schema.userSettings.userId, user.id)).run();
    } else {
      db.insert(schema.userSettings).values({ userId: user.id, ...patch }).run();
    }

    const row = db.select().from(schema.userSettings)
      .where(eq(schema.userSettings.userId, user.id)).get();
    return NextResponse.json({ settings: row });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Update settings error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
