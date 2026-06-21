import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { getTextProvider } from '@/lib/ai/factory';
import { renderTemplate, extractJson } from '@/lib/generate/template';
import { ALL_CATEGORIES } from '@/prompts/categories';

const Schema = z.object({
  categoryId: z.number().int().positive(),
  topic: z.string(),
  outline: z.string().optional(),
  count: z.number().int().min(1).max(10),
  providerId: z.number().int().positive(),
  modelId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = Schema.parse(body);

    const db = getDb();
    const category = db.select().from(schema.categories).where(eq(schema.categories.id, data.categoryId)).get();
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    const catConfig = ALL_CATEGORIES.find((c) => c.slug === category.slug);
    if (!catConfig) return NextResponse.json({ error: `Prompt config not found for slug: ${category.slug}` }, { status: 404 });
    const template = catConfig.prompts.imagePrompt;

    const systemPrompt = '你是 AI 图像生成提示词专家。';
    const userPrompt = renderTemplate(template, {
      topic: data.topic,
      count: String(data.count),
    });

    const provider = await getTextProvider(data.providerId);
    let fullText = '';
    for await (const chunk of provider.generateStream({
      systemPrompt,
      userPrompt,
      model: data.modelId,
      temperature: 0.8,
    })) {
      if (chunk.type === 'text' && chunk.content) {
        fullText += chunk.content;
      }
    }

    const prompts = extractJson<string[]>(fullText) || [];
    return NextResponse.json({ prompts: prompts.slice(0, data.count) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}