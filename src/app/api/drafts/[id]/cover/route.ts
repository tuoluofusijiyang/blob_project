import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { generateImages } from '@/lib/generate/engine';

const Schema = z.object({
  providerId: z.number().int().positive(),
  modelId: z.string().min(1),
  prompt: z.string().max(500).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
});

const RATIO_SIZES: Record<string, [number, number]> = {
  '16:9': [1280, 720],
  '4:3': [1024, 768],
  '3:2': [1200, 800],
  '1:1': [1024, 1024],
  '3:4': [960, 1280],
  '2:3': [800, 1200],
  '9:16': [720, 1280],
};

function ratioToSize(ratio: string | null | undefined): [number, number] {
  if (!ratio) return [1280, 720];
  return RATIO_SIZES[ratio] || [1280, 720];
}

function buildPrompt(draft: { title: string | null; contentMd: string | null }, userPrompt?: string): string {
  if (userPrompt?.trim()) return userPrompt.trim();
  const title = draft.title || '一篇优质文章';
  const snippet = (draft.contentMd || '').replace(/[#*`>\-\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  return `为文章《${title}》生成封面图。${snippet ? `内容摘要：${snippet}` : ''}风格：专业、有视觉冲击力、适合作为公众号/平台封面，留白合理便于叠加文字。`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = Schema.parse(body);

    const db = getDb();
    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: '草稿不存在' }, { status: 404 });

    // 校验 provider/model 归属当前用户
    const model = db.select().from(schema.aiModels).where(eq(schema.aiModels.id, Number(data.modelId))).get();
    if (!model) return NextResponse.json({ error: '模型不存在' }, { status: 404 });
    if (model.providerId !== data.providerId) {
      return NextResponse.json({ error: '模型与 Provider 不匹配' }, { status: 400 });
    }
    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, model.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Provider 不存在' }, { status: 403 });

    // 解析 platform 的 coverRatio → 像素尺寸
    const platform = draft.platform
      ? db.select().from(schema.platformFormats).where(eq(schema.platformFormats.slug, draft.platform)).get()
      : null;
    let imageRules: { coverRatio?: string; maxWidth?: number } = {};
    try {
      if (platform?.imageRules) imageRules = JSON.parse(platform.imageRules);
    } catch {}
    const [defaultW, defaultH] = ratioToSize(imageRules.coverRatio);
    const width = data.width ?? defaultW;
    const height = data.height ?? defaultH;

    // modelId 实际是 aiModels.id（数字），generateImages 期望 model 是字符串
    const modelIdStr = model.modelId;

    const prompt = buildPrompt(
      { title: draft.title, contentMd: draft.contentMd },
      data.prompt,
    );

    const images = await generateImages({
      prompts: [prompt],
      width,
      height,
      providerId: data.providerId,
      modelId: modelIdStr,
      userId: user.id,
      draftId: draft.id,
    });

    if (images.length === 0) {
      return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
    }

    db.update(schema.drafts)
      .set({
        coverImageId: images[0].id,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(schema.drafts.id, draft.id))
      .run();

    return NextResponse.json({
      image: images[0],
      width,
      height,
      ratio: imageRules.coverRatio || '16:9',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Generate cover error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '生成失败' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();
    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, Number(id)), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    db.update(schema.drafts)
      .set({ coverImageId: null, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.drafts.id, draft.id))
      .run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
