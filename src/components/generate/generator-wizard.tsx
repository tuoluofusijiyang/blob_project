'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, ChevronRight, RefreshCw, FileText } from 'lucide-react';
import { MarkdownEditor } from './markdown-editor';

interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string;
}

interface Provider {
  id: number;
  name: string;
  type: string;
  models: Array<{ id: number; modelId: string; displayName: string; type: string }>;
}

interface Platform {
  slug: string;
  name: string;
  wordMin: number;
  wordMax: number;
}

type Step = 'category' | 'models' | 'compose' | 'images' | 'export';

interface ArticleOutline {
  title: string;
  sections: Array<{ heading: string; points: string[] }>;
}

export function GeneratorWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('category');
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [textProviderId, setTextProviderId] = useState<number | null>(null);
  const [textModelId, setTextModelId] = useState<string>('');
  const [imageProviderId, setImageProviderId] = useState<number | null>(null);
  const [imageModelId, setImageModelId] = useState<string>('');

  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [platform, setPlatform] = useState('wechat');
  const [allowEngagement, setAllowEngagement] = useState(false);
  const [enableReasoning, setEnableReasoning] = useState(true);
  const [enableWebSearch, setEnableWebSearch] = useState(true);

  const [title, setTitle] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [outline, setOutline] = useState<ArticleOutline | null>(null);

  const [draftId, setDraftId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [images, setImages] = useState<Array<{ id: number; filePath: string; prompt: string }>>([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/providers').then((r) => r.json()),
      fetch('/api/platforms').then((r) => r.json()),
    ]).then(([cats, provs, plats]) => {
      setCategories(cats.categories || []);
      setProviders(provs.providers || []);
      setPlatforms(plats.platforms || []);
      if (plats.platforms?.length) setPlatform(plats.platforms[0].slug);

      const tp = provs.providers?.find((p: Provider) => p.models.some((m: any) => m.type === 'text'));
      const ip = provs.providers?.find((p: Provider) => p.models.some((m: any) => m.type === 'image'));
      if (tp) {
        setTextProviderId(tp.id);
        const tm = tp.models.find((m: any) => m.type === 'text');
        if (tm) setTextModelId(tm.modelId);
      }
      if (ip) {
        setImageProviderId(ip.id);
        const im = ip.models.find((m: any) => m.type === 'image');
        if (im) setImageModelId(im.modelId);
      }
    });
  }, []);

  // 生成中的计时器
  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [generating]);

  async function generateArticle() {
    if (!categoryId || !textProviderId || !textModelId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          topic: topic.trim(),
          keywords: keywords.split(/[,，]/).map((k) => k.trim()).filter(Boolean),
          platform,
          providerId: textProviderId,
          modelId: textModelId,
          allowEngagement,
          enableReasoning,
          enableWebSearch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setDraftId(data.draftId);
      setTitle(data.title);
      setContentMd(data.contentMd);
      setOutline(data.outline);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  }

  async function generateImages() {
    if (!draftId || !imageProviderId || !imageModelId || !contentMd) return;
    setGeneratingImages(true);
    setError(null);
    try {
      const promptsRes = await fetch('/api/generate/image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          topic,
          outline: contentMd.slice(0, 1500),
          count: 3,
          providerId: textProviderId,
          modelId: textModelId,
        }),
      });
      const promptsData = await promptsRes.json();
      const prompts: string[] = promptsData.prompts || [];
      if (prompts.length === 0) {
        setError('未生成图片提示词');
        return;
      }

      const res = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          prompts,
          providerId: imageProviderId,
          modelId: imageModelId,
        }),
      });
      if (!res.ok) {
        setError('图片生成失败');
        return;
      }
      const data = await res.json();
      setImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成图片失败');
    } finally {
      setGeneratingImages(false);
    }
  }

  async function saveAndExport() {
    if (!draftId) return;
    await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        contentMd,
        platform,
        status: 'finalized',
      }),
    });
    router.push(`/drafts/${draftId}?platform=${platform}`);
  }

  const steps: Step[] = ['category', 'models', 'compose', 'images', 'export'];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground text-center">
          步骤 {currentIndex + 1} / {steps.length}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {step === 'category' && (
        <Card>
          <CardHeader>
            <CardTitle>选择分类</CardTitle>
            <CardDescription>选择你要写的内容类型</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setStep('models'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary hover:bg-accent',
                    categoryId === cat.id && 'border-primary bg-accent'
                  )}
                >
                  <span className="text-4xl">{cat.icon}</span>
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground text-center">{cat.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'models' && (
        <Card>
          <CardHeader>
            <CardTitle>选择模型</CardTitle>
            <CardDescription>选择文本和图像生成模型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>文本模型</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={`${textProviderId}:${textModelId}`}
                onChange={(e) => {
                  const [pid, mid] = e.target.value.split(':');
                  setTextProviderId(Number(pid));
                  setTextModelId(mid);
                }}
              >
                {providers.flatMap((p) =>
                  p.models.filter((m) => m.type === 'text').map((m) => (
                    <option key={`${p.id}:${m.modelId}`} value={`${p.id}:${m.modelId}`}>
                      {p.name} - {m.displayName || m.modelId}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label>图像模型</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={`${imageProviderId}:${imageModelId}`}
                onChange={(e) => {
                  const [pid, mid] = e.target.value.split(':');
                  setImageProviderId(Number(pid));
                  setImageModelId(mid);
                }}
              >
                {providers.flatMap((p) =>
                  p.models.filter((m) => m.type === 'image').map((m) => (
                    <option key={`${p.id}:${m.modelId}`} value={`${p.id}:${m.modelId}`}>
                      {p.name} - {m.displayName || m.modelId}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('category')}>上一步</Button>
              <Button onClick={() => setStep('compose')}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'compose' && (
        <ComposeStep
          topic={topic}
          setTopic={setTopic}
          keywords={keywords}
          setKeywords={setKeywords}
          platform={platform}
          setPlatform={setPlatform}
          platforms={platforms}
          allowEngagement={allowEngagement}
          setAllowEngagement={setAllowEngagement}
          enableReasoning={enableReasoning}
          setEnableReasoning={setEnableReasoning}
          enableWebSearch={enableWebSearch}
          setEnableWebSearch={setEnableWebSearch}
          title={title}
          setTitle={setTitle}
          contentMd={contentMd}
          setContentMd={setContentMd}
          outline={outline}
          generating={generating}
          elapsed={elapsed}
          onGenerate={generateArticle}
          onBack={() => setStep('models')}
          onNext={() => setStep('images')}
          hasResult={!!contentMd}
        />
      )}

      {step === 'images' && (
        <Card>
          <CardHeader>
            <CardTitle>图片</CardTitle>
            <CardDescription>
              {generatingImages ? '生成中...' : `${images.length} 张图片`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {generatingImages ? '正在生成...' : '点击下方按钮生成封面图'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {images.map((img) => (
                  <div key={img.id} className="rounded-md border p-2">
                    <img src={`/api/images/${img.filePath}`} alt={img.prompt} className="w-full rounded" />
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{img.prompt}</p>
                  </div>
                ))}
              </div>
            )}
            {generatingImages && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成图片...
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('compose')}>上一步</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateImages} disabled={generatingImages}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {images.length > 0 ? '重新生成' : '生成图片'}
                </Button>
                <Button onClick={() => setStep('export')}>下一步</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'export' && (
        <Card>
          <CardHeader>
            <CardTitle>导出</CardTitle>
            <CardDescription>选择目标平台并保存</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>目标平台</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {platforms.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-1">
              <p>标题：{title || '未命名'}</p>
              <p>字数：{contentMd.length} 字</p>
              <p>图片：{images.length} 张</p>
            </div>
            <Button onClick={saveAndExport} className="w-full" size="lg">
              保存并预览导出
            </Button>
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep('images')}>上一步</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComposeStep({
  topic, setTopic,
  keywords, setKeywords,
  platform, setPlatform,
  platforms,
  allowEngagement, setAllowEngagement,
  enableReasoning, setEnableReasoning,
  enableWebSearch, setEnableWebSearch,
  title, setTitle,
  contentMd, setContentMd,
  outline,
  generating, elapsed,
  onGenerate, onBack, onNext,
  hasResult,
}: {
  topic: string; setTopic: (v: string) => void;
  keywords: string; setKeywords: (v: string) => void;
  platform: string; setPlatform: (v: string) => void;
  platforms: Platform[];
  allowEngagement: boolean; setAllowEngagement: (v: boolean) => void;
  enableReasoning: boolean; setEnableReasoning: (v: boolean) => void;
  enableWebSearch: boolean; setEnableWebSearch: (v: boolean) => void;
  title: string; setTitle: (v: string) => void;
  contentMd: string; setContentMd: (v: string) => void;
  outline: ArticleOutline | null;
  generating: boolean; elapsed: number;
  onGenerate: () => void;
  onBack: () => void;
  onNext: () => void;
  hasResult: boolean;
}) {
  const [showOutline, setShowOutline] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasResult ? '文章预览' : '输入主题'}</CardTitle>
        <CardDescription>
          {hasResult
            ? '已生成完整文章，可编辑后再进入下一步'
            : '填主题可精准生成，留空则 AI 根据分类自行选题'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>主题（可选）</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="留空则 AI 根据分类自行选题"
              disabled={generating}
            />
          </div>
          <div className="space-y-2">
            <Label>关键词（可选，逗号分隔）</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="agent, 多模态, 工作流"
              disabled={generating}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>目标平台</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={generating}
            >
              {platforms.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowEngagement}
            onChange={(e) => setAllowEngagement(e.target.checked)}
            disabled={generating}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <div className="text-sm leading-relaxed">
            <div className="font-medium">允许文末互动引导</div>
            <div className="text-xs text-muted-foreground">
              默认关闭。开启后 AI 可能在文末加「请在评论区告诉我答案」「点赞关注」之类的话术。做文章分享建议保持关闭。
            </div>
          </div>
        </label>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableReasoning}
              onChange={(e) => setEnableReasoning(e.target.checked)}
              disabled={generating}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div className="text-sm leading-relaxed">
              <div className="font-medium">思考模式</div>
              <div className="text-xs text-muted-foreground">
                默认开启。支持模型（Claude、o1/o3 等）会先推理再回答，提升质量；不支持则自动忽略。
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={(e) => setEnableWebSearch(e.target.checked)}
              disabled={generating}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div className="text-sm leading-relaxed">
              <div className="font-medium">联网模式</div>
              <div className="text-xs text-muted-foreground">
                默认开启。支持模型（如 DeepSeek）会调用联网搜索获取实时信息；不支持则自动忽略。
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerate}
            disabled={generating}
            size="lg"
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generating ? `生成中... (${elapsed}s)` : (hasResult ? '重新生成' : '生成文章')}
          </Button>
          {generating && (
            <span className="text-xs text-muted-foreground">
              正在等待模型返回，可能需要 10-60 秒
            </span>
          )}
        </div>

        {hasResult && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  正文（Markdown）
                </Label>
                <span className="text-xs text-muted-foreground">{contentMd.length} 字</span>
              </div>
              <MarkdownEditor value={contentMd} onChange={setContentMd} theme="default" />
            </div>

            {outline && outline.sections.length > 0 && (
              <div className="rounded-md border bg-muted/20">
                <button
                  onClick={() => setShowOutline(!showOutline)}
                  className="flex w-full items-center gap-2 p-3 text-left"
                >
                  {showOutline ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    文章结构预览（{outline.sections.length} 个章节）
                  </span>
                </button>
                {showOutline && (
                  <ol className="space-y-1 border-t px-3 py-2 text-sm">
                    {outline.sections.map((s, i) => (
                      <li key={i}>
                        <span className="text-muted-foreground">{i + 1}. </span>
                        {s.heading}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={onBack} disabled={generating}>上一步</Button>
              <Button onClick={onNext} size="lg">下一步：生成图片</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}