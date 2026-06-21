import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and, notInArray } from 'drizzle-orm';
import { OpenAICompatibleProvider } from '@/lib/ai/openai';
import { AnthropicProvider } from '@/lib/ai/anthropic';
import { getKey } from '@/lib/keychain';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, Number(id)), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const apiKey = await getKey(provider.apiKeyRef);
    if (!apiKey) return NextResponse.json({ error: 'API Key 不存在' }, { status: 400 });

    let instance;
    if (provider.type === 'openai') {
      instance = new OpenAICompatibleProvider(provider.apiKeyRef, provider.baseUrl || undefined);
    } else if (provider.type === 'anthropic') {
      instance = new AnthropicProvider(provider.apiKeyRef, provider.baseUrl || undefined);
    } else {
      return NextResponse.json({ error: '不支持的 provider 类型' }, { status: 400 });
    }

    const remoteModels = await instance.listModels();

    // 已有 model id 集合
    const existing = db.select().from(schema.aiModels)
      .where(eq(schema.aiModels.providerId, provider.id))
      .all();
    const existingIds = new Set(existing.map((m) => m.modelId));
    const remoteIds = new Set(remoteModels.map((m) => m.id));

    // 1. 删除已不存在的远端模型
    const toDelete = existing.filter((m) => !remoteIds.has(m.modelId));
    for (const m of toDelete) {
      db.delete(schema.aiModels).where(eq(schema.aiModels.id, m.id)).run();
    }

    // 2. 添加新模型
    const added: string[] = [];
    for (const rm of remoteModels) {
      if (!existingIds.has(rm.id)) {
        db.insert(schema.aiModels).values({
          providerId: provider.id,
          modelId: rm.id,
          type: rm.type,
          displayName: rm.displayName,
        }).run();
        added.push(rm.id);
      }
    }

    return NextResponse.json({
      success: true,
      added,
      removed: toDelete.map((m) => m.modelId),
      total: remoteModels.length,
    });
  } catch (err) {
    console.error('Refresh models error:', err);
    const message = err instanceof Error ? err.message : '刷新失败';
    return NextResponse.json({ error: `刷新失败：${message}` }, { status: 500 });
  }
}