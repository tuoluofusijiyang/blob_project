import type { ArticleContent, FormattedOutput, PlatformAdapter } from './base';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineImages(content: ArticleContent, maxWidth: number, imageClass = ''): string {
  return content.images.map((img) =>
    `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" width="${Math.min(img.width, maxWidth)}"${imageClass ? ` class="${imageClass}"` : ''} />${img.caption ? `<p class="caption">${escapeHtml(img.caption)}</p>` : ''}`
  ).join('\n');
}

function markdownToHtml(md: string): string {
  // 极简 Markdown → HTML（够用即可，复杂场景可换 marked）
  return md
    .split('\n\n')
    .map((para) => {
      if (para.startsWith('## ')) return `<h2>${escapeHtml(para.slice(3))}</h2>`;
      if (para.startsWith('# ')) return `<h1>${escapeHtml(para.slice(2))}</h1>`;
      if (para.startsWith('- ')) {
        const items = para.split('\n').map((l) => `<li>${escapeHtml(l.slice(2))}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      if (para.startsWith('```')) {
        const code = para.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }
      // inline bold/italic
      const formatted = escapeHtml(para)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return `<p style="text-indent:2em;">${formatted}</p>`;
    })
    .join('\n');
}

export const wechatAdapter: PlatformAdapter = {
  slug: 'wechat',
  name: '微信公众号',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const warnings: string[] = [];
    const body = markdownToHtml(content.markdown);
    const images = inlineImages(content, 900);
    const html = `<h1 style="text-align:center;font-size:18px;">${escapeHtml(content.title)}</h1>\n${body}\n${images}`;
    if (content.markdown.length < 800) warnings.push('文章字数偏少，建议 800 字以上');
    if (content.markdown.length > 3000) warnings.push('文章字数偏多，建议拆分');
    return { format: 'html', content: html, warnings };
  },
  validate(content) {
    const w: string[] = [];
    if (content.markdown.length < 800) w.push('字数偏少');
    if (content.markdown.length > 3000) w.push('字数偏多');
    return w;
  },
};

export const csdnAdapter: PlatformAdapter = {
  slug: 'csdn',
  name: 'CSDN',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const warnings: string[] = [];
    const md = `# ${content.title}\n\n${content.markdown}\n\n${content.images.map((i) => `![${i.alt}](${i.url})`).join('\n\n')}`;
    if (content.markdown.length < 1000) warnings.push('CSDN 建议 1000 字以上');
    return { format: 'markdown', content: md, warnings };
  },
  validate: () => [],
};

export const juejinAdapter: PlatformAdapter = {
  slug: 'juejin',
  name: '掘金',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const warnings: string[] = [];
    const md = `# ${content.title}\n\n${content.markdown}\n\n${content.images.map((i) => `![${i.alt}](${i.url})`).join('\n\n')}`;
    return { format: 'markdown', content: md, warnings };
  },
  validate: () => [],
};

export const xiaohongshuAdapter: PlatformAdapter = {
  slug: 'xiaohongshu',
  name: '小红书',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const warnings: string[] = [];
    // 段落拆分 + emoji 强化
    const shortParagraphs = content.markdown
      .split('\n\n')
      .map((p) => {
        const emojiPrefix = ['✨', '🌟', '💫', '📌', '🎯'][Math.floor(Math.random() * 5)];
        return p.length > 50 ? p.match(/.{1,50}/g)!.map((s, i) => `${i === 0 ? emojiPrefix + ' ' : ''}${s}`).join('\n') : `${emojiPrefix} ${p}`;
      })
      .join('\n\n');

    const md = `${'🔥'.repeat(3)} ${content.title} ${'🔥'.repeat(3)}\n\n${shortParagraphs}\n\n${content.images.slice(0, 9).map((i) => `![${i.alt}](${i.url})`).join('\n')}\n\n${(content.metadata.tags || []).map((t) => `#${t}`).join(' ')}`;
    if (content.markdown.length > 800) warnings.push('小红书建议 200-800 字');
    return { format: 'markdown', content: md, warnings };
  },
  validate: () => [],
};

export const zhihuAdapter: PlatformAdapter = {
  slug: 'zhihu',
  name: '知乎',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const warnings: string[] = [];
    const md = `# ${content.title}\n\n${content.markdown}\n\n${content.images.map((i) => `![${i.alt}](${i.url})`).join('\n\n')}`;
    return { format: 'markdown', content: md, warnings };
  },
  validate: () => [],
};

export const markdownAdapter: PlatformAdapter = {
  slug: 'markdown',
  name: '通用 Markdown',
  async format(content: ArticleContent): Promise<FormattedOutput> {
    const md = `# ${content.title}\n\n${content.markdown}\n\n${content.images.map((i) => `![${i.alt}](${i.url})`).join('\n\n')}`;
    return { format: 'markdown', content: md, warnings: [] };
  },
  validate: () => [],
};

export const ADAPTERS: Record<string, PlatformAdapter> = {
  wechat: wechatAdapter,
  csdn: csdnAdapter,
  juejin: juejinAdapter,
  xiaohongshu: xiaohongshuAdapter,
  zhihu: zhihuAdapter,
  markdown: markdownAdapter,
};