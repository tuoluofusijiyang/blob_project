'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, Trash2, Save, Eye, Code as CodeIcon, ChevronDown, Check, Image as ImageIcon, Sparkles, X, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MarkdownEditor, type MarkdownTheme } from '@/components/generate/markdown-editor';
import { ArticleRenderer, type PreviewTheme, THEME_PROFILES } from './article-renderer';
import { cn } from '@/lib/utils';

interface Draft {
  id: number;
  title: string | null;
  contentMd: string | null;
  platform: string | null;
  status: string;
}

interface Image {
  id: number;
  url: string;
  prompt: string;
  caption: string;
}

interface Platform {
  slug: string;
  name: string;
}

interface Cover {
  id: number;
  prompt: string;
  width: number | null;
  height: number | null;
}

interface ImageModelOption {
  modelDbId: number;
  providerId: number;
  label: string;
}

// 默认展示 5 个主题，其余通过下拉选择
const DEFAULT_THEMES: PreviewTheme[] = ['paper', 'wechat', 'xiaohongshu', 'github', 'notion'];
const ALL_THEMES: PreviewTheme[] = ['paper', 'wechat', 'xiaohongshu', 'notion', 'github', 'tech', 'terminal', 'sunset', 'midnight', 'academic'];

// 主题色映射（编辑器背景）
const THEME_BG: Record<PreviewTheme, MarkdownTheme> = {
  paper: 'solarized',
  wechat: 'default',
  xiaohongshu: 'default',
  notion: 'default',
  github: 'github',
  tech: 'monokai',
  terminal: 'monokai',
  sunset: 'solarized',
  midnight: 'nord',
  academic: 'solarized',
};

const THEME_LABELS: Record<PreviewTheme, string> = {
  paper: '报纸',
  wechat: '微信',
  xiaohongshu: '小红书',
  notion: '极简',
  github: 'GitHub',
  tech: '科技',
  terminal: '终端',
  sunset: '日落',
  midnight: '午夜',
  academic: '学术',
};

export function DraftEditor({
  draft: initialDraft,
  images: initialImages,
  platforms: _platforms,
  initialPlatform,
  initialCover,
}: {
  draft: Draft;
  images: Image[];
  platforms: Platform[];
  initialPlatform: string;
  initialCover: Cover | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [title, setTitle] = useState(initialDraft.title || '');
  const [content, setContent] = useState(initialDraft.contentMd || '');
  const [theme, setTheme] = useState<PreviewTheme>('paper');
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 封面图状态
  const [cover, setCover] = useState<Cover | null>(initialCover);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverImageModels, setCoverImageModels] = useState<ImageModelOption[]>([]);
  const [defaultImageModelDbId, setDefaultImageModelDbId] = useState<number | null>(null);
  const [selectedModelDbId, setSelectedModelDbId] = useState<number | null>(null);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  useEffect(() => {
    // 初始主题：根据 initialPlatform 推断
    const map: Record<string, PreviewTheme> = {
      wechat: 'wechat',
      xiaohongshu: 'xiaohongshu',
      markdown: 'paper',
    };
    if (map[initialPlatform]) setTheme(map[initialPlatform]);
  }, [initialPlatform]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开封面弹窗时加载可用的生图模型
  useEffect(() => {
    if (!showCoverModal) return;
    if (coverImageModels.length > 0) return;
    Promise.all([
      fetch('/api/providers').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([provs, sets]) => {
      const options: ImageModelOption[] = [];
      for (const p of provs.providers || []) {
        if (!p.enabled) continue;
        for (const m of p.models || []) {
          if (m.type !== 'image' || !m.enabled) continue;
          options.push({
            modelDbId: m.id,
            providerId: p.id,
            label: `${p.name} / ${m.displayName || m.modelId}`,
          });
        }
      }
      setCoverImageModels(options);
      const defaultId = sets.settings?.defaultImageModelId ?? null;
      setDefaultImageModelDbId(defaultId);
      if (defaultId && options.some((o) => o.modelDbId === defaultId)) {
        setSelectedModelDbId(defaultId);
      } else if (options.length > 0) {
        setSelectedModelDbId(options[0].modelDbId);
      }
      // 预填提示词
      if (!coverPrompt) {
        setCoverPrompt(autoCoverPrompt(title, content));
      }
    }).catch((err) => {
      console.error('Failed to load image models:', err);
    });
  }, [showCoverModal]);

  async function generateCover() {
    if (!selectedModelDbId) {
      setCoverError('请选择生图模型');
      return;
    }
    const opt = coverImageModels.find((o) => o.modelDbId === selectedModelDbId);
    if (!opt) {
      setCoverError('所选模型无效');
      return;
    }
    setGeneratingCover(true);
    setCoverError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: opt.providerId,
          modelId: String(opt.modelDbId),
          prompt: coverPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setCover({
        id: data.image.id,
        prompt: coverPrompt,
        width: data.width,
        height: data.height,
      });
      setShowCoverModal(false);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGeneratingCover(false);
    }
  }

  async function removeCover() {
    if (!confirm('确认移除封面？')) return;
    try {
      await fetch(`/api/drafts/${draft.id}/cover`, { method: 'DELETE' });
      setCover(null);
    } catch (err) {
      console.error(err);
    }
  }

  const editorTheme = THEME_BG[theme];

  const { sourceText, sourceFormat } = useMemo(() => {
    // 把 content 包装成平台格式的源码（用于复制）
    const platformSlug = (initialPlatform as any) || 'markdown';
    if (platformSlug === 'wechat') {
      // 微信公众号：复制 markdown，公众号编辑器会渲染
      return { sourceText: content, sourceFormat: 'markdown' };
    }
    if (platformSlug === 'xiaohongshu') {
      return { sourceText: content, sourceFormat: 'markdown' };
    }
    return { sourceText: content, sourceFormat: 'markdown' };
  }, [content, initialPlatform]);

  const richHtml = useMemo(() => {
    // 把 marked 渲染的 HTML + 内联样式，便于复制富文本
    if (typeof window === 'undefined') return '';
    // 这里走客户端：调 marked 不可直接，但 renderer 已 import 过
    return '';
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, contentMd: content, platform: initialPlatform }),
      });
      const data = await res.json();
      if (data.draft) setDraft(data.draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function copyAsRichText() {
    // 把 markdown 通过 marked 渲染成 HTML，加上主题 inline 样式，复制为富文本
    const { marked } = await import('marked');
    const html = marked.parse(content || '', { async: false }) as string;
    const styledHtml = injectInlineStyles(html, theme, initialPlatform);

    // 复制为富文本（HTML + 纯文本双通道）
    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({
          'text/html': new Blob([styledHtml], { type: 'text/html' }),
          'text/plain': new Blob([content], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        // Fallback：用 execCommand 复制 HTML
        const div = document.createElement('div');
        div.innerHTML = styledHtml;
        div.style.position = 'fixed';
        div.style.left = '-9999px';
        document.body.appendChild(div);
        const range = document.createRange();
        range.selectNodeContents(div);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand('copy');
        sel?.removeAllRanges();
        document.body.removeChild(div);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  async function copyAsMarkdown() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function del() {
    if (!confirm('确认删除？')) return;
    await fetch(`/api/drafts/${draft.id}`, { method: 'DELETE' });
    router.push('/drafts');
  }

  const moreThemes = ALL_THEMES.filter((t) => !DEFAULT_THEMES.includes(t));

  return (
    <div className="mx-auto max-w-[1600px] space-y-3">
      {/* 封面图区 */}
      <Card>
        <CardContent className="flex items-center gap-4 p-3">
          <div className="flex items-center gap-2 text-sm font-medium shrink-0">
            <ImageIcon className="h-4 w-4" />
            封面图
          </div>
          {cover ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={`/api/image/${cover.id}`}
                alt="封面"
                className="h-12 w-20 rounded object-cover border shrink-0"
              />
              <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                {cover.width && cover.height ? `${cover.width} × ${cover.height}` : ''}
                {cover.prompt ? ` · ${cover.prompt.slice(0, 60)}${cover.prompt.length > 60 ? '…' : ''}` : ''}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowCoverModal(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  换一张
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href={`/api/image/${cover.id}`} download={`cover-${draft.id}.png`}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" onClick={removeCover} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <div className="text-xs text-muted-foreground">暂无封面</div>
              <Button variant="outline" size="sm" onClick={() => setShowCoverModal(true)} className="ml-auto">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                生成封面图
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          className="max-w-md text-base font-semibold"
        />
        <div className="flex items-center gap-2 ml-auto">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {saved ? '已保存' : '保存'}
          </Button>
          <Button onClick={copyAsRichText} variant="default" size="sm">
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? '已复制（带格式）' : '复制富文本'}
          </Button>
          <Button onClick={copyAsMarkdown} variant="outline" size="sm">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            复制 Markdown
          </Button>
          <Button onClick={del} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 主题切换：5 个默认 + 下拉 */}
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1 w-fit">
        {DEFAULT_THEMES.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              theme === t
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background'
            )}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors',
              moreThemes.includes(theme)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background'
            )}
          >
            {moreThemes.includes(theme) ? THEME_LABELS[theme] : '更多'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showThemeDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border bg-popover p-1 shadow-lg">
              {moreThemes.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTheme(t); setShowThemeDropdown(false); }}
                  className={cn(
                    'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-accent',
                    theme === t && 'bg-accent font-medium'
                  )}
                >
                  {THEME_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑器 + 预览 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 左：Markdown 编辑 */}
        <Card>
          <CardContent className="p-0">
            <MarkdownEditor value={content} onChange={setContent} theme={editorTheme} />
          </CardContent>
        </Card>

        {/* 右：渲染预览 */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">预览</span>
                <span className="text-xs text-muted-foreground">主题：{THEME_LABELS[theme]}</span>
              </div>
              <div className="flex rounded-md border bg-background p-0.5">
                <button
                  onClick={() => setView('preview')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-1 text-xs',
                    view === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Eye className="h-3 w-3" />
                  渲染
                </button>
                <button
                  onClick={() => setView('source')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-1 text-xs',
                    view === 'source' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  <CodeIcon className="h-3 w-3" />
                  源码
                </button>
              </div>
            </div>

            {view === 'preview' ? (
              <ArticleRenderer markdown={content} theme={theme} platformStyle={initialPlatform} />
            ) : (
              <pre className="overflow-auto h-[640px] bg-zinc-950 text-zinc-100 p-4 text-xs font-mono whitespace-pre-wrap">
                {sourceText}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 封面图生成弹窗 */}
      {showCoverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !generatingCover) setShowCoverModal(false); }}
        >
          <div className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">生成封面图</h3>
              <button
                onClick={() => !generatingCover && setShowCoverModal(false)}
                disabled={generatingCover}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>生图模型</Label>
                {coverImageModels.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">暂无可用生图模型，请先在 <a href="/settings/providers" className="underline">设置</a> 添加</p>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={selectedModelDbId ?? ''}
                    onChange={(e) => setSelectedModelDbId(Number(e.target.value))}
                    disabled={generatingCover}
                  >
                    {coverImageModels.map((o) => (
                      <option key={o.modelDbId} value={o.modelDbId}>
                        {o.label}{o.modelDbId === defaultImageModelDbId ? '（默认）' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>提示词（自动从标题生成，可改）</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  placeholder="描述封面图的画面、风格、主体..."
                  disabled={generatingCover}
                />
                <p className="text-xs text-muted-foreground">
                  尺寸将按平台封面的比例自动计算（如 16:9、3:4）
                </p>
              </div>

              {coverError && (
                <p className="text-sm text-destructive">{coverError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={generateCover} disabled={generatingCover || !selectedModelDbId} className="flex-1">
                  {generatingCover ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...（10-60 秒）
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowCoverModal(false)} disabled={generatingCover}>
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 每个主题下 hljs token class 对应的 inline 颜色
const HLJS_INLINE_COLORS: Record<PreviewTheme, Record<string, string>> = {
  paper: { keyword: '#ffb86c', string: '#a8c66c', number: '#ff79c6', comment: '#8b7d5e', function: '#6fb3d2', title: '#6fb3d2', tag: '#ffb86c', name: '#ff79c6', literal: '#ff79c6', built_in: '#ffb86c', selector: '#ffb86c', variable: '#e8d9b8', attribute: '#ff79c6', regexp: '#a8c66c', symbol: '#ff79c6', params: '#e8d9b8', meta: '#8b7d5e' },
  wechat: { keyword: '#d73a49', string: '#22863a', number: '#005cc5', comment: '#6a737d', function: '#6f42c1', title: '#6f42c1', tag: '#22863a', name: '#d73a49', literal: '#005cc5', built_in: '#d73a49', selector: '#d73a49', variable: '#353535', attribute: '#005cc5', regexp: '#032f62', symbol: '#005cc5', params: '#353535', meta: '#6a737d' },
  xiaohongshu: { keyword: '#ff2442', string: '#ff6b9d', number: '#ff8c00', comment: '#d49ba8', function: '#c026d3', title: '#c026d3', tag: '#ff2442', name: '#ff2442', literal: '#ff8c00', built_in: '#ff2442', selector: '#ff2442', variable: '#2d2d2d', attribute: '#ff8c00', regexp: '#ff6b9d', symbol: '#ff8c00', params: '#2d2d2d', meta: '#d49ba8' },
  notion: { keyword: '#2eaadc', string: '#0f7b6c', number: '#b35488', comment: '#9b9a97', function: '#64473a', title: '#64473a', tag: '#64473a', name: '#b35488', literal: '#b35488', built_in: '#2eaadc', selector: '#2eaadc', variable: '#37352f', attribute: '#b35488', regexp: '#0f7b6c', symbol: '#b35488', params: '#37352f', meta: '#9b9a97' },
  github: { keyword: '#cf222e', string: '#0a3069', number: '#0550ae', comment: '#6e7781', function: '#8250df', title: '#8250df', tag: '#116329', name: '#0550ae', literal: '#0550ae', built_in: '#cf222e', selector: '#116329', variable: '#1f2328', attribute: '#0550ae', regexp: '#116329', symbol: '#0550ae', params: '#1f2328', meta: '#6e7781' },
  tech: { keyword: '#c084fc', string: '#86efac', number: '#fbbf24', comment: '#64748b', function: '#7dd3fc', title: '#7dd3fc', tag: '#c084fc', name: '#fbbf24', literal: '#fbbf24', built_in: '#c084fc', selector: '#c084fc', variable: '#f9a8d4', attribute: '#fbbf24', regexp: '#86efac', symbol: '#fbbf24', params: '#e2e8f0', meta: '#64748b' },
  terminal: { keyword: '#ffcc00', string: '#00ffff', number: '#ff79c6', comment: '#555555', function: '#ff5555', title: '#ff5555', tag: '#ffcc00', name: '#ff79c6', literal: '#ff79c6', built_in: '#ffcc00', selector: '#ffcc00', variable: '#00ff88', attribute: '#ff79c6', regexp: '#00ffff', symbol: '#ff79c6', params: '#00ff88', meta: '#555555' },
  sunset: { keyword: '#e85d4e', string: '#c2410c', number: '#b45309', comment: '#b89a8a', function: '#9a3412', title: '#9a3412', tag: '#e85d4e', name: '#b45309', literal: '#b45309', built_in: '#e85d4e', selector: '#e85d4e', variable: '#4a2c2a', attribute: '#b45309', regexp: '#c2410c', symbol: '#b45309', params: '#4a2c2a', meta: '#b89a8a' },
  midnight: { keyword: '#a78bfa', string: '#67e8f9', number: '#fbbf24', comment: '#64748b', function: '#93c5fd', title: '#93c5fd', tag: '#a78bfa', name: '#fbbf24', literal: '#fbbf24', built_in: '#a78bfa', selector: '#a78bfa', variable: '#f9a8d4', attribute: '#fbbf24', regexp: '#67e8f9', symbol: '#fbbf24', params: '#cbd5e1', meta: '#64748b' },
  academic: { keyword: '#1e40af', string: '#166534', number: '#b91c1c', comment: '#6b6b6b', function: '#7c2d12', title: '#7c2d12', tag: '#1e40af', name: '#b91c1c', literal: '#b91c1c', built_in: '#1e40af', selector: '#1e40af', variable: '#1a1a1a', attribute: '#b91c1c', regexp: '#166534', symbol: '#b91c1c', params: '#1a1a1a', meta: '#6b6b6b' },
};

// 把 marked 渲染的 HTML 加上 inline style，确保复制粘贴到富文本编辑器保留样式
// 微信兼容：代码块用 <section>、空格转 &nbsp;、避免渐变和阴影
function injectInlineStyles(html: string, theme: PreviewTheme, _platform?: string): string {
  const p = THEME_PROFILES[theme];
  const hljsColors = HLJS_INLINE_COLORS[theme];

  let styled = html;

  // 1. 代码块：兼容 <pre><code class="hljs language-XXX">...</code></pre> 和 <pre><code>...</code></pre>
  //    微信剥掉 <pre>/<code> 的 style，改用 <section> 包文本；空格全转 &nbsp; 保留格式
  //    组合 pre + preCode 样式：pre 提供边框/圆角，preCode 提供 padding/字体/颜色
  styled = styled.replace(
    /<pre>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g,
    (_match, body) => {
      const bodyWithColors = body.replace(/<span class="hljs-(\w+)">/g, (_m: string, cls: string) => {
        const color = hljsColors[cls];
        return color ? `<span style="color:${color}">` : '<span>';
      });
      const lines = bodyWithColors.split('\n');
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
      const bodyWithBr = lines
        .map((line: string) => line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;'))
        .join('<br>');
      const codeStyle = `${p.pre} ${p.preCode}`;
      return `<section style="${codeStyle}">${bodyWithBr}</section>`;
    }
  );

  // 2. 行内 <code>
  styled = styled.replace(/<code>/g, `<code style="${p.code}">`);

  // 3. 其他标签
  styled = styled.replace(/<h1(\s|>)/g, `<h1 style="${p.h1}" $1`);
  styled = styled.replace(/<h2(\s|>)/g, `<h2 style="${p.h2}" $1`);
  styled = styled.replace(/<h3(\s|>)/g, `<h3 style="${p.h3}" $1`);
  styled = styled.replace(/<h4(\s|>)/g, `<h4 style="${p.h4}" $1`);
  styled = styled.replace(/<p>/g, `<p style="${p.p}">`);
  styled = styled.replace(/<blockquote>/g, `<blockquote style="${p.blockquote}">`);
  styled = styled.replace(/<ul>/g, `<ul style="${p.ul}">`);
  styled = styled.replace(/<ol>/g, `<ol style="${p.ol}">`);
  styled = styled.replace(/<li>/g, `<li style="${p.li}">`);
  styled = styled.replace(/<table>/g, `<table style="${p.table}">`);
  styled = styled.replace(/<th(\s|>)/g, `<th style="${p.th}" $1`);
  styled = styled.replace(/<td(\s|>)/g, `<td style="${p.td}" $1`);
  styled = styled.replace(/<hr(\s|>)/g, `<hr style="${p.hr}" $1`);
  styled = styled.replace(/<a /g, `<a style="${p.a}" `);
  styled = styled.replace(/<img /g, `<img style="${p.img}" `);
  styled = styled.replace(/<strong>/g, `<strong style="${p.strong}">`);
  styled = styled.replace(/<em>/g, `<em style="${p.em}">`);

  return `<section style="background-color:${p.bgHex};color:${p.fgHex};padding:16px;font-family:${p.font};line-height:1.85;">${styled}</section>`;
}

function autoCoverPrompt(title: string, content: string): string {
  const cleanTitle = title.trim() || '一篇优质文章';
  const snippet = content.replace(/[#*`>\-\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  return `为文章《${cleanTitle}》生成封面图。${snippet ? `内容摘要：${snippet}` : ''}风格：专业、有视觉冲击力、适合作为公众号/平台封面，留白合理便于叠加文字。`;
}
