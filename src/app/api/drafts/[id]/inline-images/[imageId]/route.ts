import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { generateImages } from '@/lib/generate/engine';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';

const PatchSchema = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  providerId: z.number().int().positive(),
  modelId: z.string().min(1),
});

// PATCH：重新生成单张（draftImageId 是 draftImages.id，重新生成后 id 不变，只更新 imageId 字段）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    const user = await requireAuth();
    const { id, imageId } = await params;
    const body = await req.json();
    const data = PatchSchema.parse(body);

    const draftId = Number(id);
    const draftImageId = Number(imageId);
    const db = getDb();

    const di = db.select().from(schema.draftImages)
      .where(and(eq(schema.draftImages.id, draftImageId), eq(schema.draftImages.draftId, draftId)))
      .get();
    if (!di) return NextResponse.json({ error: '图片不存在' }, { status: 404 });

    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: '草稿不存在' }, { status: 403 });

    const model = db.select().from(schema.aiModels).where(eq(schema.aiModels.id, Number(data.modelId))).get();
    if (!model) return NextResponse.json({ error: '模型不存在' }, { status: 404 });
    if (model.providerId !== data.providerId) {
      return NextResponse.json({ error: '模型与 Provider 不匹配' }, { status: 400 });
    }
    const provider = db.select().from(schema.aiProviders)
      .where(and(eq(schema.aiProviders.id, model.providerId), eq(schema.aiProviders.userId, user.id)))
      .get();
    if (!provider) return NextResponse.json({ error: 'Provider 不存在' }, { status: 403 });

    const oldImg = db.select().from(schema.generatedImages).where(eq(schema.generatedImages.id, di.imageId)).get();
    const prompt = data.prompt || oldImg?.prompt || '';

    // 生成新图
    const images = await generateImages({
      prompts: [prompt],
      width: oldImg?.width ?? 1024,
      height: oldImg?.height ?? 1024,
      providerId: data.providerId,
      modelId: model.modelId,
      userId: user.id,
      draftId,
    });

    if (images.length === 0) {
      return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
    }

    const newImg = images[0];
    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
    const newBase64 = (await readFile(join(dataDir, newImg.filePath))).toString('base64');

    // 更新 draftImages.imageId 指向新图（关键：先更新引用，再删旧 generatedImages 行，避免 cascade 误删 draftImages）
    db.update(schema.draftImages)
      .set({ imageId: newImg.id })
      .where(eq(schema.draftImages.id, draftImageId))
      .run();

    // 删除旧 generatedImages 行 + 物理文件
    if (oldImg) {
      db.delete(schema.generatedImages).where(eq(schema.generatedImages.id, oldImg.id)).run();
      try {
        await unlink(join(dataDir, oldImg.filePath));
      } catch {}
    }

    return NextResponse.json({
      draftImageId,
      imageId: newImg.id,
      base64: newBase64,
      prompt: newImg.prompt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Regenerate inline image error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '重新生成失败' }, { status: 500 });
  }
}

// DELETE：删除单张图片，返回 raw 让客户端恢复 markdown 为 [[IMG: ...]]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    const user = await requireAuth();
    const { id, imageId } = await params;

    const draftId = Number(id);
    const draftImageId = Number(imageId);
    const db = getDb();

    const di = db.select().from(schema.draftImages)
      .where(and(eq(schema.draftImages.id, draftImageId), eq(schema.draftImages.draftId, draftId)))
      .get();
    if (!di) return NextResponse.json({ error: '图片不存在' }, { status: 404 });

    const draft = db.select().from(schema.drafts)
      .where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.userId, user.id)))
      .get();
    if (!draft) return NextResponse.json({ error: '草稿不存在' }, { status: 403 });

    const raw = di.caption || '';
    const oldImg = db.select().from(schema.generatedImages).where(eq(schema.generatedImages.id, di.imageId)).get();
    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');

    // 先删 draftImages 行（外键不反向 cascade）
    db.delete(schema.draftImages).where(eq(schema.draftImages.id, draftImageId)).run();

    // 再删 generatedImages 行 + 物理文件
    if (oldImg) {
      db.delete(schema.generatedImages).where(eq(schema.generatedImages.id, oldImg.id)).run();
      try {
        await unlink(join(dataDir, oldImg.filePath));
      } catch {}
    }

    return NextResponse.json({ raw });
  } catch (err) {
    console.error('Delete inline image error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
