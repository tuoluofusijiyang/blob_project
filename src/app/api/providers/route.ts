import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/middleware';
import { setKey } from '@/lib/keychain';
import { OpenAICompatibleProvider } from '@/lib/ai/openai';
import { AnthropicProvider } from '@/lib/ai/anthropic';
import { eq, and } from 'drizzle-orm';

const ProviderSchema = z.object({
  type: z.enum(['openai', 'anthropic']),
  name: z.string().min(1).max(64),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDb();
    const providers = db.select().from(schema.aiProviders)
      .where(eq(schema.aiProviders.userId, user.id))
      .all();

    const result = await Promise.all(providers.map(async (p) => {
      const models = db.select().from(schema.aiModels)
        .where(eq(schema.aiModels.providerId, p.id))
        .all();
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        baseUrl: p.baseUrl,
        enabled: !!p.enabled,
        hasKey: true,
        models,
      };
    }));

    return NextResponse.json({ providers: result });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = ProviderSchema.parse(body);

    const db = getDb();

    // 将 Key 存入 OS Keychain
    const apiKeyRef = `user-${user.id}-${data.type}-${Date.now()}`;
    await setKey(apiKeyRef, data.apiKey);

    // 创建 provider
    const provider = db.insert(schema.aiProviders).values({
      userId: user.id,
      type: data.type,
      name: data.name,
      apiKeyRef,
      baseUrl: data.baseUrl || null,
    }).returning().get();

    // 自动获取可用模型（失败不影响 provider 创建）
    let listError: string | null = null;
    try {
      let providerInstance;
      if (data.type === 'openai') {
        providerInstance = new OpenAICompatibleProvider(apiKeyRef, data.baseUrl || undefined);
      } else {
        providerInstance = new AnthropicProvider(apiKeyRef, data.baseUrl || undefined);
      }
      const models = await providerInstance.listModels();

      for (const m of models) {
        db.insert(schema.aiModels).values({
          providerId: provider.id,
          modelId: m.id,
          type: m.type,
          displayName: m.displayName,
        }).run();
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      listError = err instanceof Error ? err.message : '未知错误';
    }

    return NextResponse.json({
      provider: { ...provider, apiKeyRef: undefined },
      listError,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Add provider error:', err);
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { id } = await req.json();
    const db = getDb();

    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, id), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { deleteKey } = await import('@/lib/keychain');
    await deleteKey(provider.apiKeyRef);
    db.delete(schema.aiProviders).where(eq(schema.aiProviders.id, id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}