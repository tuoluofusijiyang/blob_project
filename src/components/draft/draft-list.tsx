'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';

interface Draft {
  id: number;
  title: string | null;
  contentMd: string | null;
  platform: string | null;
  status: string;
  updatedAt: number;
}

export function DraftList({ drafts }: { drafts: Draft[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(e: React.MouseEvent, id: number, title: string | null) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确认删除草稿「${title || '(无标题)'}」？此操作不可恢复。`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          还没有草稿。点击「新建草稿」开始。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((d) => {
        const isDeleting = deletingId === d.id || isPending;
        return (
          <div key={d.id} className="relative group">
            <Link href={`/drafts/${d.id}`} className="block">
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{d.title || '(无标题)'}</CardTitle>
                    <CardDescription className="shrink-0 text-xs">
                      {d.platform && `${d.platform} · `}
                      {new Date(d.updatedAt * 1000).toLocaleString('zh-CN')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {(d.contentMd || '').replace(/[#*`]/g, '').slice(0, 200)}
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleDelete(e, d.id, d.title)}
              disabled={isDeleting}
              aria-label="删除草稿"
            >
              {isDeleting && deletingId === d.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}