import { getDb, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { getTextProvider, getImageProvider } from '@/lib/ai/factory';
import { renderTemplate, extractJson } from './template';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface OutlineParams {
  categoryId: number;
  topic: string;
  keywords?: string[];
  wordCount: number;
  platform: string;
  providerId: number;
  modelId: string;
  enableReasoning?: boolean;
  enableWebSearch?: boolean;
}

export async function* generateOutline(params: OutlineParams) {
  const db = getDb();
  const category = db.select().from(schema.categories).where(eq(schema.categories.id, params.categoryId)).get();
  if (!category) throw new Error('Category not found');

  const template = db.select().from(schema.promptTemplates)
    .where(eq(schema.promptTemplates.categoryId, params.categoryId))
    .all()
    .find((t) => t.templateType === 'outline');
  if (!template) throw new Error('Outline template not found');

  const systemPrompt = `你是一名专业的内容创作者，擅长生成结构化大纲。`;
  const userPrompt = renderTemplate(template.template, {
    topic: params.topic,
    keywords: (params.keywords || []).join('、'),
    wordCount: String(params.wordCount),
    platform: params.platform,
  });

  const provider = await getTextProvider(params.providerId);
  let fullText = '';

  for await (const chunk of provider.generateStream({
    systemPrompt,
    userPrompt,
    model: params.modelId,
    temperature: 0.7,
    enableReasoning: params.enableReasoning ?? true,
    enableWebSearch: params.enableWebSearch ?? true,
  })) {
    if (chunk.type === 'text' && chunk.content) {
      fullText += chunk.content;
      yield { type: 'text', content: chunk.content };
    }
    if (chunk.type === 'usage') {
      yield { type: 'usage', usage: chunk.usage };
    }
  }

  const outline = extractJson<{ title: string; sections: Array<{ heading: string; points: string[] }> }>(fullText);
  yield { type: 'done', outline: outline || { title: params.topic, sections: [] } };
}

export interface ArticleParams {
  categoryId: number;
  topic: string;
  outline?: { title: string; sections: Array<{ heading: string; points: string[] }> };
  keywords?: string[];
  wordCount?: number;
  platform: string;
  providerId: number;
  modelId: string;
  draftId?: number;
  userId?: number;
  allowEngagement?: boolean;
  enableReasoning?: boolean;
  enableWebSearch?: boolean;
}

export interface ArticleFullResult {
  title: string;
  contentMd: string;
  outline: { title: string; sections: Array<{ heading: string; points: string[] }> };
}

function parseMarkdownStructure(md: string): { title: string; outline: ArticleFullResult['outline']['sections'] } {
  const lines = md.split('\n');
  let title = '';
  let currentSection = '';
  const sectionsMap = new Map<string, string[]>();
  let bufferPoints: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.slice(2).trim();
    } else if (line.startsWith('## ') && !line.startsWith('### ')) {
      if (currentSection) sectionsMap.set(currentSection, bufferPoints);
      currentSection = line.slice(3).trim();
      bufferPoints = [];
    } else if (line && currentSection) {
      bufferPoints.push(line);
    }
  }
  if (currentSection) sectionsMap.set(currentSection, bufferPoints);

  const sections = Array.from(sectionsMap.entries()).map(([heading, points]) => ({
    heading,
    points: points.filter((p) => p && !p.startsWith('---') && p.length < 200).slice(0, 4),
  }));
  return { title, outline: sections };
}

export async function generateArticleFull(params: ArticleParams): Promise<ArticleFullResult> {
  const db = getDb();

  const template = db.select().from(schema.promptTemplates)
    .where(eq(schema.promptTemplates.categoryId, params.categoryId))
    .all()
    .find((t) => t.templateType === 'article');
  if (!template) throw new Error('Article template not found');

  const category = db.select().from(schema.categories)
    .where(eq(schema.categories.id, params.categoryId)).get();
  const categoryName = category?.name || '该领域';

  const hasTopic = !!params.topic?.trim();
  const topicValue = hasTopic
    ? params.topic.trim()
    : `（用户未指定主题。请你作为「${categoryName}」领域的专业内容创作者，自行选择一个当前热门、有吸引力的话题，直接写完整文章）`;

  const engagementNote = params.allowEngagement
    ? ''
    : '\n\n【文末风格 - 严格执行】\n- 严禁在文末使用互动套话：「请在评论区告诉我答案」「评论区见」「期待你的回复」「点赞关注」「更多精彩下期分享」等\n- 直接用最后一个观点或一句话收尾，自然结束\n- 收尾要和全文融为一体，不另起突兀的呼吁';

  const systemPrompt = `你是一名专业的内容创作者，严格按用户要求的 JSON 格式输出。`;
  const userPrompt = renderTemplate(template.template, {
    topic: topicValue,
    keywords: (params.keywords || []).join('、'),
    keywords_block: params.keywords?.length
      ? `关键词：${params.keywords.join('、')}\n`
      : '',
    platform: params.platform,
    outline_block: params.outline
      ? `参考大纲：\n${JSON.stringify(params.outline, null, 2)}\n`
      : '',
    outline: params.outline ? JSON.stringify(params.outline, null, 2) : '',
  }) + engagementNote;

  const provider = await getTextProvider(params.providerId);
  let fullContent = '';

  // 不限字数：max_tokens 给到 16000（约 8000 字中文），让内容写完整不截断
  const maxTokens = 16000;

  for await (const chunk of provider.generateStream({
    systemPrompt,
    userPrompt,
    model: params.modelId,
    temperature: 0.8,
    maxTokens,
    enableReasoning: params.enableReasoning ?? true,
    enableWebSearch: params.enableWebSearch ?? true,
  })) {
    if (chunk.type === 'text' && chunk.content) {
      fullContent += chunk.content;
    }
  }

  if (!fullContent.trim()) throw new Error('模型未返回内容');

  // 优先尝试解析 JSON {title, content}
  const json = extractJson<Record<string, unknown>>(fullContent);
  let finalTitle: string;
  let contentMd: string;

  if (json && typeof json === 'object') {
    // 兼容多种正文字段名：content（标准）/ body / text / markdown
    const bodyField = ['content', 'body', 'text', 'markdown'].find((k) => typeof (json as any)[k] === 'string');
    if (bodyField) {
      const body = ((json as any)[bodyField] as string).trim();
      if (!body) throw new Error('模型返回的 content 字段为空');
      finalTitle = (json.title as string || '').trim() || params.outline?.title || params.topic || `未命名（${categoryName}）`;
      contentMd = body;
    } else {
      // JSON 但没有可识别的正文字段
      const keys = Object.keys(json).join(', ');
      throw new Error(`模型返回的 JSON 缺少正文字段（需要 content）。实际字段：${keys}`);
    }
  } else {
    // 兼容旧格式：从 markdown 中解析 # 标题
    const { title, outline: sections } = parseMarkdownStructure(fullContent);
    finalTitle = title || params.outline?.title || params.topic || `未命名（${categoryName}）`;
    contentMd = fullContent.trim();
  }

  // 从最终 contentMd 重新解析结构（用于大纲展示）
  const { outline: sections } = parseMarkdownStructure(contentMd);

  return {
    title: finalTitle,
    contentMd,
    outline: {
      title: finalTitle,
      sections: sections.length > 0
        ? sections
        : (params.outline?.sections ?? []),
    },
  };
}

export async function* generateArticle(params: ArticleParams) {
  const db = getDb();

  const template = db.select().from(schema.promptTemplates)
    .where(eq(schema.promptTemplates.categoryId, params.categoryId))
    .all()
    .find((t) => t.templateType === 'article');
  if (!template) throw new Error('Article template not found');

  const systemPrompt = `你是一名专业的内容创作者，写出吸引人的完整文章。`;
  const userPrompt = renderTemplate(template.template, {
    topic: params.topic,
    wordCount: String(params.wordCount),
    platform: params.platform,
    outline: JSON.stringify(params.outline, null, 2),
  });

  const provider = await getTextProvider(params.providerId);
  let fullContent = '';
  let title = params.outline?.title || '';

  for await (const chunk of provider.generateStream({
    systemPrompt,
    userPrompt,
    model: params.modelId,
    temperature: 0.7,
    maxTokens: Math.max((params.wordCount || 2000) * 2, 2048),
    enableReasoning: params.enableReasoning ?? true,
    enableWebSearch: params.enableWebSearch ?? true,
  })) {
    if (chunk.type === 'text' && chunk.content) {
      fullContent += chunk.content;
      // 提取第一个 # 作为标题
      if (!title && chunk.content.includes('#')) {
        const match = fullContent.match(/^#\s+(.+)$/m);
        if (match) title = match[1].trim();
      }
      yield { type: 'text', content: chunk.content };
    }
    if (chunk.type === 'usage') {
      yield { type: 'usage', usage: chunk.usage };
    }
  }

  // 保存草稿
  if (params.draftId) {
    db.update(schema.drafts)
      .set({
        title,
        contentMd: fullContent,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(schema.drafts.id, params.draftId))
      .run();
  }

  yield { type: 'done', content: fullContent, title };
}

export interface ImageParams {
  prompts: string[];
  width: number;
  height: number;
  providerId: number;
  modelId: string;
  userId: number;
  draftId: number;
}

export async function generateImages(params: ImageParams): Promise<Array<{ id: number; filePath: string; prompt: string }>> {
  const provider = await getImageProvider(params.providerId);
  const results: Array<{ id: number; filePath: string; prompt: string }> = [];
  const db = getDb();

  // 并发最多 3 张
  const concurrency = 3;
  const queue = [...params.prompts];

  async function processOne(prompt: string) {
    try {
      const imgs = await provider.generate({
        prompt,
        model: params.modelId,
        width: params.width,
        height: params.height,
        n: 1,
      });
      if (imgs.length === 0) return null;
      const img = imgs[0];

      // 保存图片
      const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
      const imagesDir = join(dataDir, 'images', String(params.userId), String(params.draftId));
      await mkdir(imagesDir, { recursive: true });

      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const filePath = join(imagesDir, filename);
      const relativePath = `images/${params.userId}/${params.draftId}/${filename}`;

      if (img.base64) {
        await writeFile(filePath, Buffer.from(img.base64, 'base64'));
      } else if (img.url) {
        const res = await fetch(img.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        await writeFile(filePath, buffer);
      }

      const inserted = db.insert(schema.generatedImages).values({
        userId: params.userId,
        filePath: relativePath,
        prompt,
        modelId: null,
        width: params.width,
        height: params.height,
      }).returning().get();

      return { id: inserted.id, filePath: relativePath, prompt };
    } catch (err) {
      console.error(`Failed to generate image for prompt "${prompt}":`, err);
      return null;
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const prompt = queue.shift();
        if (!prompt) break;
        const result = await processOne(prompt);
        if (result) results.push(result);
      }
    })());
  }
  await Promise.all(workers);

  return results;
}