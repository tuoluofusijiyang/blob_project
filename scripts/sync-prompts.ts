/**
 * 同步代码里的 prompt 模板到数据库
 *
 * 用途：改了 src/prompts/categories/index.ts 之后，跑这个脚本把更新覆盖到 DB。
 * 规则：只覆盖 isBuiltin = 1 的内置模板；isBuiltin = 0 的用户自定义模板不动。
 *
 * 用法：npx tsx scripts/sync-prompts.ts
 */

import { getDb, schema } from '../src/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { ALL_CATEGORIES } from '../src/prompts/categories';

function syncBuiltinPrompts() {
  const db = getDb();
  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const cat of ALL_CATEGORIES) {
    const category = db.select().from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug)).get();

    if (!category) {
      console.warn(`⚠️  分类 ${cat.slug} 不存在，跳过（先跑 db:migrate + seed）`);
      skipped++;
      continue;
    }

    for (const [type, template] of Object.entries(cat.prompts)) {
      const existing = db.select().from(schema.promptTemplates)
        .where(and(
          eq(schema.promptTemplates.categoryId, category.id),
          eq(schema.promptTemplates.templateType, type),
        )).get();

      if (!existing) {
        // DB 里没有 → 插入
        db.insert(schema.promptTemplates).values({
          categoryId: category.id,
          templateType: type,
          name: type,
          template,
          isBuiltin: 1,
        }).run();
        inserted++;
        console.log(`  + ${cat.slug}/${type} 已插入`);
      } else if (existing.isBuiltin === 1) {
        // DB 里有且是内置 → 覆盖
        db.update(schema.promptTemplates)
          .set({ template })
          .where(eq(schema.promptTemplates.id, existing.id))
          .run();
        updated++;
        console.log(`  ✓ ${cat.slug}/${type} 已更新（${template.length} 字符）`);
      } else {
        // DB 里有但是用户自定义 → 跳过
        console.log(`  ⊘ ${cat.slug}/${type} 是用户自定义，跳过覆盖`);
        skipped++;
      }
    }
  }

  console.log(`\n完成：更新 ${updated} 条，插入 ${inserted} 条，跳过 ${skipped} 条`);
}

syncBuiltinPrompts();