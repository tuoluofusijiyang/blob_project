import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { generateImages } from '@/lib/generate/engine';
import { readFile } from 'fs/promises';
import { join } from 'path';

const Schema = z.object({
  items: z.array(z.object({
    raw: z.string().min(1),
    prompt: z.string().min(1).max(2000),
  })).min(1).max(10),
  providerId: z.number().int().positive(),
  modelId: z.string().min(1),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = Schema.parse(body);

    const draftId = Number(id);
    const db = getDb();

    // 校验 draft 归属
    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: '草稿不存在' }, { status: 404 });

    // 校验 provider/model
    const model = db.select().from(schema.aiModels).where(eq(schema.aiModels.id, Number(data.modelId))).get();
    if (!model) return NextResponse.json({ error: '模型不存在' }, { status: 404 });
    if (model.providerId !== data.providerId) {
      return NextResponse.json({ error: '模型与 Provider 不匹配' }, { status: 400 });
    }
    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, model.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Provider 不存在' }, { status: 403 });

    // 调引擎批量生成（best-effort，单张失败不影响其他）
    const prompts = data.items.map((it) => it.prompt);
    const generatedImages = await generateImages({
      prompts,
      width: data.width ?? 1024,
      height: data.height ?? 1024,
      providerId: data.providerId,
      modelId: model.modelId,
      userId: user.id,
      draftId,
    });

    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');

    // 把成功的图片关联到 draftImages（caption 存原文 raw）
    const results: Array<{
      draftImageId: number;
      imageId: number;
      base64: string;
      raw: string;
      prompt: string;
    }> = [];

    // 用 prompt 匹配定位 items 索引（generateImages 按 prompts 顺序生成）
    let imgIdx = 0;
    for (let i = 0; i < data.items.length && imgIdx < generatedImages.length; i++) {
      const item = data.items[i];
      const img = generatedImages[imgIdx];

      // prompt 字符串匹配（防止 generateImages 内部重排）
      if (img.prompt !== item.prompt) {
        // 跳过这张，找下一个匹配的
        continue;
      }

      try {
        const filePath = join(dataDir, img.filePath);
        const buf = await readFile(filePath);
        const base64 = buf.toString('base64');

        const inserted = db.insert(schema.draftImages).values({
          draftId,
          imageId: img.id,
          position: i,
          caption: item.raw,
        }).returning().get();

        results.push({
          draftImageId: inserted.id,
          imageId: img.id,
          base64,
          raw: item.raw,
          prompt: item.prompt,
        });
        imgIdx++;
      } catch (err) {
        console.error(`Failed to process generated image ${img.id}:`, err);
        imgIdx++;
      }
    }

    // 计算失败的 items
    const successIndexes = new Set(results.map((r) => data.items.findIndex((it) => it.prompt === r.prompt)));
    const failed = data.items
      .map((it, idx) => ({ ...it, idx }))
      .filter((it) => !successIndexes.has(it.idx))
      .map((it) => ({ index: it.idx, raw: it.raw, prompt: it.prompt, error: '生成失败' }));

    return NextResponse.json({ images: results, failed });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Generate inline images error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '生成失败' }, { status: 500 });
  }
}
