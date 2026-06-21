import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { generateArticleFull } from '@/lib/generate/engine';

const Schema = z.object({
  categoryId: z.number().int().positive(),
  topic: z.string().max(200).optional().default(''),
  keywords: z.array(z.string()).optional(),
  platform: z.string(),
  providerId: z.number().int().positive(),
  modelId: z.string(),
  allowEngagement: z.boolean().optional().default(false),
  enableReasoning: z.boolean().optional().default(true),
  enableWebSearch: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = Schema.parse(body);

    const db = getDb();

    // 先创建或获取草稿
    const draftRes = db.insert(schema.drafts).values({
      userId: user.id,
      categoryId: data.categoryId,
      title: data.topic || `未命名草稿 - ${new Date().toLocaleString('zh-CN')}`,
      contentMd: '',
      platform: data.platform,
      status: 'draft',
    }).returning().get();

    // 一次性生成（非流式）
    const result = await generateArticleFull({
      ...data,
      topic: data.topic || '',
      draftId: draftRes.id,
      userId: user.id,
    });

    // 更新草稿
    db.update(schema.drafts)
      .set({
        title: result.title,
        contentMd: result.contentMd,
        metadata: JSON.stringify({ outline: result.outline }),
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(schema.drafts.id, draftRes.id))
      .run();

    return NextResponse.json({
      draftId: draftRes.id,
      title: result.title,
      contentMd: result.contentMd,
      outline: result.outline,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Generate full error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '生成失败' }, { status: 500 });
  }
}