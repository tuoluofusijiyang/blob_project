// 内联图片 markdown 操作的纯函数工具
// 设计：已生成的图片用 `![image-${draftImageId}](data:image/png;base64,...)` 锚定
// 未生成的占位符用 `[[IMG: prompt]]` 表示
// draftImageId 是 draftImages 表的自增 id，重新生成时不变（只更新 imageId 字段）

export interface ImageTag {
  raw: string;        // 完整匹配 "[[IMG: prompt]]"
  prompt: string;     // prompt 文本
  index: number;      // 在 markdown 中的字符偏移
}

const IMG_TAG_REGEX = /\[\[IMG:([^\]]+)\]\]/g;

// 扫描 markdown 中的 [[IMG: ...]] 标签
export function extractImageTags(md: string): ImageTag[] {
  const tags: ImageTag[] = [];
  for (const m of md.matchAll(IMG_TAG_REGEX)) {
    tags.push({
      raw: m[0],
      prompt: m[1].trim(),
      index: m.index ?? 0,
    });
  }
  return tags;
}

// 替换 markdown 中第一个匹配的 [[IMG: ...]] 为图片 markdown
// 仅替换第一个，确保按调用顺序一对一替换
export function replaceImageTag(md: string, raw: string, imageMarkdown: string): string {
  const idx = md.indexOf(raw);
  if (idx === -1) return md;
  return md.slice(0, idx) + imageMarkdown + md.slice(idx + raw.length);
}

// 构造已生成图片的 markdown 文本
export function buildInlineImageMarkdown(draftImageId: number, base64: string): string {
  return `![image-${draftImageId}](data:image/png;base64,${base64})`;
}

// 在 markdown 中按 draftImageId 定位已生成图片
export function findImageByDraftId(md: string, draftImageId: number): { dataUrl: string; fullMatch: string; index: number } | null {
  const re = new RegExp(`!\\[image-${draftImageId}\\]\\(data:image/png;base64,([A-Za-z0-9+/=]+)\\)`);
  const m = re.exec(md);
  if (!m) return null;
  return {
    dataUrl: m[1],
    fullMatch: m[0],
    index: m.index,
  };
}

// 替换 markdown 中指定 draftImageId 的图片 dataUrl（重新生成时用）
export function replaceImageByDraftId(md: string, draftImageId: number, newBase64: string): string {
  const found = findImageByDraftId(md, draftImageId);
  if (!found) return md;
  const replacement = buildInlineImageMarkdown(draftImageId, newBase64);
  return md.slice(0, found.index) + replacement + md.slice(found.index + found.fullMatch.length);
}

// 删除 markdown 中指定 draftImageId 的图片，替换为原 [[IMG: ...]]
export function restoreImageTag(md: string, draftImageId: number, raw: string): string {
  const found = findImageByDraftId(md, draftImageId);
  if (!found) return md;
  return md.slice(0, found.index) + raw + md.slice(found.index + found.fullMatch.length);
}
