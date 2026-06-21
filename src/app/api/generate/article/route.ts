import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { generateArticle } from '@/lib/generate/engine';

const Schema = z.object({
  categoryId: z.number().int().positive(),
  topic: z.string().min(1).max(200),
  outline: z.object({
    title: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      points: z.array(z.string()),
    })),
  }),
  wordCount: z.number().int().min(100).max(20000),
  platform: z.string(),
  providerId: z.number().int().positive(),
  modelId: z.string(),
  draftId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = Schema.parse(body);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of generateArticle(data)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: '参数错误' }, { status: 400 });
    }
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}