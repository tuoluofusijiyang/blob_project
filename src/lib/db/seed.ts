import { getDb, schema } from './client';
import { eq } from 'drizzle-orm';
import { ALL_CATEGORIES } from '@/prompts/categories';

export async function seedBuiltinData() {
  const db = getDb();

  for (const cat of ALL_CATEGORIES) {
    const existing = db.select().from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug))
      .get();

    let categoryId: number;

    if (existing) {
      categoryId = existing.id;
    } else {
      const inserted = db.insert(schema.categories).values({
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        isBuiltin: 1,
        userId: null,
        sortOrder: ALL_CATEGORIES.indexOf(cat),
      }).returning().get();
      categoryId = inserted.id;
    }

    // 检查是否已有提示词模板
    const existingTemplates = db.select().from(schema.promptTemplates)
      .where(eq(schema.promptTemplates.categoryId, categoryId))
      .all();

    const existingTypes = new Set(existingTemplates.map((t) => t.templateType));

    for (const [type, template] of Object.entries(cat.prompts)) {
      if (existingTypes.has(type)) continue;
      db.insert(schema.promptTemplates).values({
        categoryId,
        templateType: type,
        name: type,
        template,
        isBuiltin: 1,
      }).run();
    }
  }
}

// 平台格式预置
const PLATFORM_FORMATS = [
  {
    slug: 'wechat',
    name: '微信公众号',
    outputFormat: 'rich-text',
    styleGuide: '段落短、图片关键、首行缩进、字号 16px',
    wordMin: 800,
    wordMax: 3000,
    imageRules: JSON.stringify({ maxWidth: 900, coverRatio: '16:9', inlineCount: 3 }),
  },
  {
    slug: 'csdn',
    name: 'CSDN',
    outputFormat: 'markdown',
    styleGuide: '技术风格、标准 Markdown、支持代码块',
    wordMin: 1000,
    wordMax: 5000,
    imageRules: JSON.stringify({ maxWidth: 1200, coverRatio: '16:9' }),
  },
  {
    slug: 'juejin',
    name: '掘金',
    outputFormat: 'markdown',
    styleGuide: '技术风格、emoji 友好、代码块必备',
    wordMin: 800,
    wordMax: 4000,
    imageRules: JSON.stringify({ maxWidth: 1200, coverRatio: '16:9' }),
  },
  {
    slug: 'xiaohongshu',
    name: '小红书',
    outputFormat: 'rich-text',
    styleGuide: '短句、emoji 多、口语化、首图关键',
    wordMin: 200,
    wordMax: 800,
    imageRules: JSON.stringify({ maxWidth: 1080, coverRatio: '3:4', inlineCount: 5 }),
  },
  {
    slug: 'zhihu',
    name: '知乎',
    outputFormat: 'markdown',
    styleGuide: '长文、结构清晰、引用块、LaTeX',
    wordMin: 1500,
    wordMax: 8000,
    imageRules: JSON.stringify({ maxWidth: 1200, coverRatio: '16:9' }),
  },
  {
    slug: 'markdown',
    name: '通用 Markdown',
    outputFormat: 'markdown',
    styleGuide: '标准 Markdown、原样输出',
    wordMin: 0,
    wordMax: 99999,
    imageRules: JSON.stringify({ maxWidth: 9999 }),
  },
];

export async function seedPlatformFormats() {
  const db = getDb();
  for (const pf of PLATFORM_FORMATS) {
    const existing = db.select().from(schema.platformFormats)
      .where(eq(schema.platformFormats.slug, pf.slug))
      .get();
    if (existing) continue;
    db.insert(schema.platformFormats).values({ ...pf, isBuiltin: 1 }).run();
  }
}