'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading2, Code, Link as LinkIcon, Quote } from 'lucide-react';

export type MarkdownTheme = 'default' | 'github' | 'monokai' | 'nord' | 'solarized';

export const THEMES: Record<MarkdownTheme, { label: string; bg: string; fg: string; accent: string; border: string }> = {
  default: {
    label: '默认',
    bg: 'bg-white dark:bg-zinc-900',
    fg: 'text-zinc-900 dark:text-zinc-100',
    accent: 'text-blue-600 dark:text-blue-400',
    border: 'border-zinc-200 dark:border-zinc-800',
  },
  github: {
    label: 'GitHub',
    bg: 'bg-[#f6f8fa] dark:bg-[#0d1117]',
    fg: 'text-[#1f2328] dark:text-[#e6edf3]',
    accent: 'text-[#0969da] dark:text-[#58a6ff]',
    border: 'border-[#d0d7de] dark:border-[#30363d]',
  },
  monokai: {
    label: 'Monokai',
    bg: 'bg-[#272822]',
    fg: 'text-[#f8f8f2]',
    accent: 'text-[#66d9ef]',
    border: 'border-[#3e3d32]',
  },
  nord: {
    label: 'Nord',
    bg: 'bg-[#2e3440]',
    fg: 'text-[#d8dee9]',
    accent: 'text-[#88c0d0]',
    border: 'border-[#3b4252]',
  },
  solarized: {
    label: 'Solarized',
    bg: 'bg-[#fdf6e3]',
    fg: 'text-[#586e75]',
    accent: 'text-[#268bd2]',
    border: 'border-[#eee8d5]',
  },
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  theme: MarkdownTheme;
}

export function MarkdownEditor({ value, onChange, theme }: Props) {
  const t = THEMES[theme];

  function insert(before: string, after = '', placeholder = '') {
    const ta = document.getElementById('md-editor-textarea') as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  return (
    <div className={cn('rounded-md border overflow-hidden', t.border, t.bg)}>
      {/* Toolbar */}
      <div className={cn('flex flex-wrap items-center gap-1 border-b px-2 py-1.5', t.border)}>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('**', '**', '加粗')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('*', '*', '斜体')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('## ', '', '标题')}>
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('- ', '', '列表项')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('1. ', '', '有序项')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('> ', '', '引用')}>
          <Quote className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('`', '`', 'code')}>
          <Code className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className={cn('h-7 px-2', t.fg)} onClick={() => insert('[', '](https://)', '链接文本')}>
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor */}
      <textarea
        id="md-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-[600px] p-4 font-mono text-sm resize-none focus:outline-none',
          t.bg, t.fg
        )}
        spellCheck={false}
      />
    </div>
  );
}