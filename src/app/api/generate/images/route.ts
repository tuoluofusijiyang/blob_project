import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { generateImages } from '@/lib/generate/engine';

const Schema = z.object({
  draftId: z.number().int().positive(),
  prompts: z.array(z.string()).min(1).max(10),
  providerId: z.number().int().positive(),
  modelId: z.string(),
  width: z.number().int().min(256).max(2048).optional().default(1024),
  height: z.number().int().min(256).max(2048).optional().default(1024),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = Schema.parse(body);

    const images = await generateImages({
      ...data,
      userId: user.id,
    });

    // 关联到草稿
    const { getDb, schema } = await import('@/lib/db/client');
    const db = getDb();

    for (let i = 0; i < images.length; i++) {
      db.insert(schema.draftImages).values({
        draftId: data.draftId,
        imageId: images[i].id,
        position: i,
        caption: null,
      }).run();
    }

    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Generate images error:', err);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}