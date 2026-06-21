'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Model {
  id: number;
  modelId: string;
  displayName: string | null;
  type: string;
  enabled: number;
}

interface Provider {
  id: number;
  name: string;
  type: string;
  baseUrl?: string | null;
  enabled: boolean;
  models: Model[];
}

export function ProvidersClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);
  const [editingProvider, setEditingProvider] = useState<number | null>(null);
  const [defaultTextModelId, setDefaultTextModelId] = useState<number | null>(null);
  const [defaultImageModelId, setDefaultImageModelId] = useState<number | null>(null);

  // Add form state
  const [type, setType] = useState('openai');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadProviders();
    loadSettings();
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setDefaultTextModelId(data.settings.defaultTextModelId ?? null);
        setDefaultImageModelId(data.settings.defaultImageModelId ?? null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveDefault(kind: 'text' | 'image', modelId: number | null) {
    if (kind === 'text') setDefaultTextModelId(modelId);
    else setDefaultImageModelId(modelId);
    const body: Record<string, unknown> = {};
    if (kind === 'text') {
      body.defaultTextModelId = modelId;
      const m = modelId == null ? null : findModel(modelId);
      body.defaultTextProviderId = m?.providerId ?? null;
    } else {
      body.defaultImageModelId = modelId;
      const m = modelId == null ? null : findModel(modelId);
      body.defaultImageProviderId = m?.providerId ?? null;
    }
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || '保存默认模型失败');
    }
  }

  function findModel(modelId: number): { providerId: number } | null {
    for (const p of providers) {
      if (p.models.some((m) => m.id === modelId)) return { providerId: p.id };
    }
    return null;
  }

  const textModelOptions = useMemo(() => {
    const opts: { value: number; label: string; disabled: boolean }[] = [];
    for (const p of providers) {
      if (!p.enabled) continue;
      for (const m of p.models) {
        if (m.type !== 'text') continue;
        opts.push({
          value: m.id,
          label: `${p.name} / ${m.displayName || m.modelId}${!m.enabled ? '（已停用）' : ''}`,
          disabled: !m.enabled,
        });
      }
    }
    return opts;
  }, [providers]);

  const imageModelOptions = useMemo(() => {
    const opts: { value: number; label: string; disabled: boolean }[] = [];
    for (const p of providers) {
      if (!p.enabled) continue;
      for (const m of p.models) {
        if (m.type !== 'image') continue;
        opts.push({
          value: m.id,
          label: `${p.name} / ${m.displayName || m.modelId}${!m.enabled ? '（已停用）' : ''}`,
          disabled: !m.enabled,
        });
      }
    }
    return opts;
  }, [providers]);

  async function addProvider(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, apiKey, baseUrl: baseUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '添加失败');
      setShowAddForm(false);
      setName('');
      setApiKey('');
      setBaseUrl('');
      loadProviders();
      if (data.listError) {
        alert(`Provider 已添加，但自动拉取模型失败：${data.listError}\n\n请展开 Provider 后用「手动添加模型」添加。`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProvider(id: number) {
    if (!confirm('确定删除？该 Provider 下所有模型也会被删除')) return;
    await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    setExpandedProvider(null);
    setEditingProvider(null);
    loadProviders();
  }

  async function saveProviderEdit(id: number) {
    setEditSubmitting(true);
    try {
      const body: any = { name: editName };
      if (editBaseUrl !== '') body.baseUrl = editBaseUrl;
      if (editApiKey) body.apiKey = editApiKey;
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setEditingProvider(null);
      loadProviders();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function refreshModels(providerId: number) {
    try {
      const res = await fetch(`/api/providers/${providerId}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '刷新失败');
      const msg = data.added?.length || data.removed?.length
        ? `已刷新：新增 ${data.added.length}，移除 ${data.removed.length}`
        : `已刷新，共 ${data.total} 个模型`;
      alert(msg);
      loadProviders();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刷新失败');
    }
  }

  async function toggleModel(modelId: number, enabled: boolean) {
    await fetch(`/api/models/${modelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
    });
    loadProviders();
  }

  async function deleteModel(modelId: number) {
    if (!confirm('删除该模型？')) return;
    await fetch(`/api/models/${modelId}`, { method: 'DELETE' });
    loadProviders();
  }

  async function renameModel(modelId: number, displayName: string) {
    await fetch(`/api/models/${modelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    loadProviders();
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>默认模型</CardTitle>
          <CardDescription>选择生成文章和图片时使用的默认模型，可在生成时临时切换</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>默认文本模型</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={defaultTextModelId ?? ''}
              onChange={(e) => saveDefault('text', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">未选择</option>
              {textModelOptions.length === 0 ? (
                <option value="" disabled>暂无可用文本模型</option>
              ) : (
                textModelOptions.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground">用于生成大纲、文章、提示词</p>
          </div>
          <div className="space-y-2">
            <Label>默认生图模型</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={defaultImageModelId ?? ''}
              onChange={(e) => saveDefault('image', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">未选择</option>
              {imageModelOptions.length === 0 ? (
                <option value="" disabled>暂无可用生图模型</option>
              ) : (
                imageModelOptions.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground">用于生成封面图、正文配图</p>
          </div>
        </CardContent>
      </Card>

      {!showAddForm && (
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加 Provider
        </Button>
      )}

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>添加 AI Provider</CardTitle>
            <CardDescription>API Key 将加密存储到本机 Keychain</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addProvider} className="space-y-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="openai">OpenAI 兼容（DeepSeek、通义千问、Moonshot 等）</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>显示名</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="我的 OpenAI" required />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL（可选）</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-xs text-muted-foreground">
                  自定义端点用于兼容协议（DeepSeek、通义千问等）
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  添加
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            还没有配置任何 Provider
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              expanded={expandedProvider === p.id}
              editing={editingProvider === p.id}
              onToggle={() => setExpandedProvider(expandedProvider === p.id ? null : p.id)}
              onEdit={() => {
                if (editingProvider !== p.id) {
                  setEditName(p.name);
                  setEditBaseUrl(p.baseUrl || '');
                  setEditApiKey('');
                }
                setEditingProvider(editingProvider === p.id ? null : p.id);
              }}
              editName={editName}
              editBaseUrl={editBaseUrl}
              editApiKey={editApiKey}
              setEditName={setEditName}
              setEditBaseUrl={setEditBaseUrl}
              setEditApiKey={setEditApiKey}
              onSaveEdit={() => saveProviderEdit(p.id)}
              editSubmitting={editSubmitting}
              onDelete={() => deleteProvider(p.id)}
              onRefresh={() => refreshModels(p.id)}
              onToggleModel={toggleModel}
              onDeleteModel={deleteModel}
              onRenameModel={renameModel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  expanded,
  editing,
  onToggle,
  onEdit,
  editName,
  editBaseUrl,
  editApiKey,
  setEditName,
  setEditBaseUrl,
  setEditApiKey,
  onSaveEdit,
  editSubmitting,
  onDelete,
  onRefresh,
  onToggleModel,
  onDeleteModel,
  onRenameModel,
}: {
  provider: Provider;
  expanded: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  editName: string;
  editBaseUrl: string;
  editApiKey: string;
  setEditName: (v: string) => void;
  setEditBaseUrl: (v: string) => void;
  setEditApiKey: (v: string) => void;
  onSaveEdit: () => void;
  editSubmitting: boolean;
  onDelete: () => void;
  onRefresh: () => void;
  onToggleModel: (id: number, enabled: boolean) => void;
  onDeleteModel: (id: number) => void;
  onRenameModel: (id: number, name: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{provider.name}</CardTitle>
            <CardDescription>
              {provider.type} {provider.baseUrl && `· ${provider.baseUrl}`}
              {' · '}
              {provider.models.filter((m) => m.enabled).length} / {provider.models.length} 个模型启用
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {editing && (
        <CardContent className="border-t bg-muted/50 pt-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>显示名</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input value={editBaseUrl} onChange={(e) => setEditBaseUrl(e.target.value)} placeholder="留空使用默认" />
            </div>
            <div className="space-y-2">
              <Label>替换 API Key（留空不修改）</Label>
              <Input
                type="password"
                value={editApiKey}
                onChange={(e) => setEditApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSaveEdit} disabled={editSubmitting}>
                {editSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
              <Button variant="outline" onClick={onEdit}>取消</Button>
            </div>
          </div>
        </CardContent>
      )}

      {expanded && (
        <CardContent className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">模型管理</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-3 w-3" />
                从 API 刷新模型
              </Button>
            </div>
          </div>

          <AddModelForm providerId={provider.id} onAdded={onRefresh} />

          {provider.models.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无模型（可手动添加）</p>
          ) : (
            <div className="space-y-2">
              {provider.models.map((m) => (
                <ModelRow
                  key={m.id}
                  model={m}
                  onToggle={(enabled) => onToggleModel(m.id, enabled)}
                  onDelete={() => onDeleteModel(m.id)}
                  onRename={(name) => onRenameModel(m.id, name)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function AddModelForm({ providerId, onAdded }: { providerId: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<'text' | 'image'>('text');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!modelId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId: modelId.trim(),
          displayName: displayName.trim() || undefined,
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '添加失败');
      setModelId('');
      setDisplayName('');
      setType('text');
      setOpen(false);
      onAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-3">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-3 w-3" />
          手动添加模型
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mb-3 rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
        <div className="space-y-1">
          <Label className="text-xs">模型 ID / 接入点 ID</Label>
          <Input
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="如 doubao-seedream-3-0-t2i-250415 或 ep-xxxxx"
            className="h-8"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">显示名（可选）</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="豆包生图 3.0"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">类型</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as 'text' | 'image')}
          >
            <option value="text">文本</option>
            <option value="image">生图</option>
          </select>
        </div>
        <div className="flex items-end gap-1">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            添加
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); setModelId(''); setDisplayName(''); }}>
            取消
          </Button>
        </div>
      </div>
    </form>
  );
}

function ModelRow({
  model,
  onToggle,
  onDelete,
  onRename,
}: {
  model: Model;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(model.displayName || model.modelId);

  return (
    <div className={cn(
      'flex items-center justify-between rounded-md border p-3 transition-colors',
      !model.enabled && 'opacity-50'
    )}>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
              autoFocus
            />
            <Button size="sm" onClick={() => { onRename(name); setEditing(false); }}>保存</Button>
            <Button size="sm" variant="outline" onClick={() => { setName(model.displayName || model.modelId); setEditing(false); }}>取消</Button>
          </div>
        ) : (
          <>
            <p className="font-medium truncate">{model.displayName || model.modelId}</p>
            <p className="text-xs text-muted-foreground truncate">
              {model.modelId} ·
              <span className={cn(
                'ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                model.type === 'text' && 'bg-blue-100 text-blue-700',
                model.type === 'image' && 'bg-purple-100 text-purple-700',
              )}>
                {model.type === 'text' ? '文本' : model.type === 'image' ? '生图' : model.type}
              </span>
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!!model.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          启用
        </label>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}