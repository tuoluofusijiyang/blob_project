'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import { cn } from '@/lib/utils';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  const t = title ? ` title="${title}"` : '';
  return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch {
        // 极端兜底：原样转义后返回，绝不让单个代码块炸掉整篇文章
        return code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    },
  })
);
marked.setOptions({ renderer, gfm: true, breaks: false });

export type PreviewTheme =
  | 'paper'
  | 'wechat'
  | 'xiaohongshu'
  | 'notion'
  | 'github'
  | 'tech'
  | 'terminal'
  | 'sunset'
  | 'midnight'
  | 'academic';

export interface ThemeProfile {
  label: string;
  wrapperBg: string;
  articleBg: string;
  fg: string;
  accent: string;
  border: string;
  codeTheme: string;
  // 用于复制富文本时的纯色（避开 tailwind class 解析）
  bgHex: string;
  fgHex: string;
  accentHex: string;
  borderHex: string;
  // 每个主题独有的样式（用于复制富文本和覆盖渲染）
  font: string;
  base: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  p: string;
  blockquote: string;
  code: string;
  pre: string;
  preCode: string;
  ul: string;
  ol: string;
  li: string;
  table: string;
  th: string;
  td: string;
  hr: string;
  a: string;
  img: string;
  strong: string;
  em: string;
}

// 每个主题一套完整且差异化极大的元素样式
export const THEME_PROFILES: Record<PreviewTheme, ThemeProfile> = {
  paper: {
    label: '报纸',
    wrapperBg: 'bg-[#e8e3d8]',
    articleBg: 'bg-[#fbf6e9]',
    fg: 'text-[#3a2f24]',
    accent: 'text-[#a04825]',
    border: 'border-[#d4c9a8]',
    codeTheme: 'paper',
    bgHex: '#fbf6e9',
    fgHex: '#3a2f24',
    accentHex: '#a04825',
    borderHex: '#d4c9a8',
    font: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif',
    base: 'line-height:1.7; font-size:16.5px;',
    h1: 'font-family:Georgia,"Songti SC",serif; font-size:2.3rem; font-weight:700; text-align:center; margin:0 0 2rem; padding:0 0 1rem; line-height:1.25; border-bottom:4px double #a04825; letter-spacing:0.02em;',
    h2: 'font-family:Georgia,"Songti SC",serif; font-size:1.55rem; font-weight:700; margin:2.5rem 0 1rem; padding:0 0 0.4rem; border-bottom:1px solid #a04825;',
    h3: 'font-family:Georgia,serif; font-size:1.25rem; font-weight:600; font-style:italic; margin:1.75rem 0 0.6rem;',
    h4: 'font-family:Georgia,serif; font-size:1.1rem; font-weight:700; margin:1.5rem 0 0.5rem;',
    p: 'margin:0.9rem 0; line-height:1.85; text-align:justify; text-indent:2em;',
    blockquote: 'border-left:4px double #a04825; padding:0.5rem 1rem 0.5rem 1.25rem; margin:1.5rem 0; font-style:italic; font-family:Georgia,serif; background:rgba(160,72,37,0.06); color:#5a4533; position:relative;',
    code: 'font-family:"Courier New","Courier",monospace; background:#ede4cc; color:#3a2f24; padding:0.1rem 0.4rem; border-radius:3px; font-size:0.9em; border:1px solid #d4c9a8;',
    pre: 'margin:1.5rem 0; padding:0; border-radius:6px; background:#2d2418; overflow:hidden;',
    preCode: 'color:#e8d9b8; padding:1rem 1.25rem; font-family:"Courier New",Consolas,monospace; font-size:0.9rem; line-height:1.7; display:block; overflow-x:auto;',
    ul: 'padding-left:2rem; margin:1rem 0; list-style-type:square;',
    ol: 'padding-left:2rem; margin:1rem 0; list-style-type:upper-roman;',
    li: 'margin:0.4rem 0; line-height:1.8;',
    table: 'border-collapse:collapse; width:100%; margin:1.5rem 0; border:2px solid #a04825; font-family:Georgia,serif; font-size:0.95em;',
    th: 'border:1px solid #a04825; padding:0.6rem 0.85rem; text-align:left; background:#3a2f24; color:#fbf6e9; font-weight:700;',
    td: 'border:1px solid #d4c9a8; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; height:1rem; background:transparent; margin:2rem 0; text-align:center; position:relative;',
    a: 'color:#a04825; text-decoration:underline; text-decoration-style:double; text-underline-offset:3px; font-weight:600;',
    img: 'max-width:100%; height:auto; border:1px solid #a04825; padding:4px; background:#fff; margin:1rem 0;',
    strong: 'font-weight:700; color:#a04825;',
    em: 'font-style:italic;',
  },

  wechat: {
    label: '微信',
    wrapperBg: 'bg-[#ededed]',
    articleBg: 'bg-white',
    fg: 'text-[#353535]',
    accent: 'text-[#07c160]',
    border: 'border-[#e0e0e0]',
    codeTheme: 'wechat',
    bgHex: '#ffffff',
    fgHex: '#353535',
    accentHex: '#07c160',
    borderHex: '#e0e0e0',
    font: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    base: 'line-height:1.85; font-size:16.5px; letter-spacing:0.02em;',
    h1: 'font-size:1.85rem; font-weight:700; text-align:center; margin:0 0 2rem; padding:0 0 1.1rem; border-bottom:2px solid #07c160; letter-spacing:0.04em;',
    h2: 'font-size:1.45rem; font-weight:600; margin:2.25rem 0 1rem; padding:0.3rem 0; border-left:4px solid #07c160; background:#f0faf4;',
    h3: 'font-size:1.2rem; font-weight:600; margin:1.75rem 0 0.7rem; padding:0.3rem 0; border-left:2px solid #07c160;',
    h4: 'font-size:1.05rem; font-weight:600; margin:1.5rem 0 0.5rem; color:#07c160;',
    p: 'margin:1rem 0; line-height:1.95; text-indent:2em;',
    blockquote: 'border-left:4px solid #07c160; padding:0.6rem 1rem; margin:1.25rem 0; background:rgba(7,193,96,0.06); border-radius:0 4px 4px 0; color:#353535;',
    code: 'background:#f5f5f5; color:#d73a49; padding:0.15rem 0.4rem; border-radius:3px; font-size:0.875em; font-family:ui-monospace,"SF Mono",Consolas,monospace; border:1px solid #e8e8e8;',
    pre: 'margin:1.25rem 0; padding:0; border-radius:6px; background:#f5f5f5; overflow:hidden;',
    preCode: 'color:#353535; padding:1rem 1.25rem; font-family:ui-monospace,"SF Mono",Consolas,monospace; font-size:0.875rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:1.75rem; margin:1rem 0;',
    ol: 'padding-left:1.75rem; margin:1rem 0;',
    li: 'margin:0.4rem 0; line-height:1.85;',
    table: 'border-collapse:collapse; width:100%; margin:1rem 0; border:1px solid #e0e0e0; font-size:0.95em;',
    th: 'border:1px solid #e0e0e0; padding:0.6rem 0.85rem; text-align:left; background:#f0faf4; color:#07c160; font-weight:600;',
    td: 'border:1px solid #e0e0e0; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; border-top:1px solid #e0e0e0; margin:2rem 0;',
    a: 'color:#07c160; text-decoration:none; border-bottom:1px solid #07c160;',
    img: 'max-width:100%; height:auto; border-radius:4px; margin:1rem 0;',
    strong: 'font-weight:700; color:#07c160;',
    em: 'font-style:italic; color:#666;',
  },

  xiaohongshu: {
    label: '小红书',
    wrapperBg: 'bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100',
    articleBg: 'bg-white',
    fg: 'text-[#2d2d2d]',
    accent: 'text-[#ff2442]',
    border: 'border-pink-200',
    codeTheme: 'xiaohongshu',
    bgHex: '#ffffff',
    fgHex: '#2d2d2d',
    accentHex: '#ff2442',
    borderHex: '#ffd6e0',
    font: '-apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif',
    base: 'line-height:1.75; font-size:15.5px;',
    h1: 'font-size:1.45rem; font-weight:700; text-align:center; margin:0 0 1.5rem; padding:0.6rem 1rem; background-color:#fff0f3; border-radius:14px; border:1.5px dashed #ff8fa3; letter-spacing:0.03em;',
    h2: 'font-size:1.2rem; font-weight:600; margin:2rem 0 0.8rem; padding:0.3rem 0 0.4rem 0; border-left:5px solid #ff2442; border-bottom:1.5px dashed #ffc0cb; background-color:#fff5f7;',
    h3: 'font-size:1.05rem; font-weight:600; margin:1.5rem 0 0.6rem; padding:0.3rem 0; border-left:3px solid #ff8fa3; color:#ff2442;',
    h4: 'font-size:0.95rem; font-weight:600; margin:1.25rem 0 0.4rem; color:#ff6b9d;',
    p: 'margin:0.9rem 0; line-height:1.85;',
    blockquote: 'border-left:5px solid #ff2442; padding:0.7rem 1rem 0.7rem 1.2rem; margin:1.25rem 0; background-color:#fff5f7; border-radius:0 12px 12px 0; color:#2d2d2d;',
    code: 'background:#fff5f7; color:#ff2442; padding:0.15rem 0.45rem; border-radius:6px; font-size:0.875em; font-family:ui-monospace,monospace; border:1px solid #ffd6e0;',
    pre: 'margin:1.25rem 0; padding:0; border-radius:12px; background:#fff5f7; border:1.5px dashed #ffc0cb; overflow:hidden;',
    preCode: 'color:#2d2d2d; padding:1rem 1.25rem; font-family:ui-monospace,monospace; font-size:0.85rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:1.5rem; margin:1rem 0;',
    ol: 'padding-left:1.5rem; margin:1rem 0;',
    li: 'margin:0.4rem 0; line-height:1.75;',
    table: 'border-collapse:separate; border-spacing:0; width:100%; margin:1rem 0; border:1.5px solid #ffc0cb; border-radius:10px; font-size:0.95em; overflow:hidden;',
    th: 'border-bottom:1.5px solid #ffc0cb; padding:0.6rem 0.85rem; text-align:left; background:#fff0f3; color:#ff2442; font-weight:700;',
    td: 'border-bottom:1px solid #ffd6e0; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; height:1px; background-color:#ffc0cb; margin:2rem 0;',
    a: 'color:#ff2442; text-decoration:underline; padding:0 2px;',
    img: 'max-width:100%; height:auto; border-radius:12px; margin:1rem 0; border:1px solid #ffc0cb;',
    strong: 'font-weight:700; color:#ff2442; padding:0 2px;',
    em: 'font-style:italic; color:#ff6b9d;',
  },

  notion: {
    label: '极简',
    wrapperBg: 'bg-[#f7f6f3]',
    articleBg: 'bg-white',
    fg: 'text-[#37352f]',
    accent: 'text-[#2eaadc]',
    border: 'border-[#e9e9e7]',
    codeTheme: 'notion',
    bgHex: '#ffffff',
    fgHex: '#37352f',
    accentHex: '#2eaadc',
    borderHex: '#e9e9e7',
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
    base: 'line-height:1.7; font-size:16px;',
    h1: 'font-size:2.4rem; font-weight:700; margin:0 0 1rem; line-height:1.2; letter-spacing:-0.02em;',
    h2: 'font-size:1.5rem; font-weight:600; margin:2rem 0 0.5rem; line-height:1.3;',
    h3: 'font-size:1.25rem; font-weight:600; margin:1.5rem 0 0.4rem;',
    h4: 'font-size:1.05rem; font-weight:600; margin:1.25rem 0 0.3rem;',
    p: 'margin:0.75rem 0; line-height:1.7;',
    blockquote: 'border-left:3px solid #e9e9e7; padding:0.25rem 0 0.25rem 1rem; margin:1rem 0; color:#787774;',
    code: 'background:#f7f6f3; color:#eb5757; padding:0.15rem 0.4rem; border-radius:3px; font-size:0.875em; font-family:ui-monospace,SFMono-Regular,monospace;',
    pre: 'margin:1rem 0; padding:0; border-radius:4px; background:#f7f6f3; overflow:hidden;',
    preCode: 'color:#37352f; padding:0.85rem 1rem; font-family:ui-monospace,SFMono-Regular,monospace; font-size:0.85rem; line-height:1.6; display:block; overflow-x:auto;',
    ul: 'padding-left:1.5rem; margin:0.75rem 0;',
    ol: 'padding-left:1.5rem; margin:0.75rem 0;',
    li: 'margin:0.3rem 0; line-height:1.65;',
    table: 'border-collapse:collapse; width:100%; margin:1rem 0; font-size:0.95em;',
    th: 'border-bottom:1.5px solid #37352f; padding:0.4rem 0.6rem; text-align:left; font-weight:600;',
    td: 'border-bottom:1px solid #e9e9e7; padding:0.4rem 0.6rem; text-align:left;',
    hr: 'border:0; height:1px; background:#e9e9e7; margin:1.5rem 0;',
    a: 'color:#2eaadc; text-decoration:underline; text-decoration-color:rgba(46,170,220,0.4); text-underline-offset:2px;',
    img: 'max-width:100%; height:auto; border-radius:2px; margin:1rem 0;',
    strong: 'font-weight:600;',
    em: 'font-style:italic;',
  },

  github: {
    label: 'GitHub',
    wrapperBg: 'bg-[#f6f8fa] dark:bg-[#0d1117]',
    articleBg: 'bg-white dark:bg-[#0d1117]',
    fg: 'text-[#1f2328] dark:text-[#e6edf3]',
    accent: 'text-[#0969da] dark:text-[#58a6ff]',
    border: 'border-[#d0d7de] dark:border-[#30363d]',
    codeTheme: 'github',
    bgHex: '#ffffff',
    fgHex: '#1f2328',
    accentHex: '#0969da',
    borderHex: '#d0d7de',
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    base: 'line-height:1.6; font-size:16px;',
    h1: 'font-size:2em; font-weight:600; margin:0.67em 0; padding:0 0 0.3em; border-bottom:1px solid #d0d7de; line-height:1.25;',
    h2: 'font-size:1.5em; font-weight:600; margin:1.5em 0 0.5em; padding:0 0 0.3em; border-bottom:1px solid #d0d7de; line-height:1.25;',
    h3: 'font-size:1.25em; font-weight:600; margin:1.25em 0 0.4em; line-height:1.25;',
    h4: 'font-size:1em; font-weight:600; margin:1em 0 0.3em;',
    p: 'margin:0.75em 0; line-height:1.6;',
    blockquote: 'border-left:4px solid #d0d7de; padding:0 1em; margin:1em 0; color:#59636e;',
    code: 'background:rgba(175,184,193,0.2); padding:0.2em 0.4em; border-radius:6px; font-size:85%; font-family:ui-monospace,SFMono-Regular,monospace;',
    pre: 'margin:1em 0; padding:0; border-radius:6px; background:#f6f8fa; overflow:hidden;',
    preCode: 'color:#1f2328; padding:1em 1.25em; font-family:ui-monospace,SFMono-Regular,monospace; font-size:0.875em; line-height:1.45; display:block; overflow-x:auto;',
    ul: 'padding-left:2em; margin:0.75em 0;',
    ol: 'padding-left:2em; margin:0.75em 0;',
    li: 'margin:0.25em 0;',
    table: 'border-collapse:collapse; width:100%; margin:1em 0; font-size:0.95em;',
    th: 'border:1px solid #d0d7de; padding:0.5em 0.75em; text-align:left; background:#f6f8fa; font-weight:600;',
    td: 'border:1px solid #d0d7de; padding:0.5em 0.75em; text-align:left;',
    hr: 'border:0; height:0.25em; background:#d0d7de; border-radius:2px; margin:1.5em 0;',
    a: 'color:#0969da; text-decoration:none;',
    img: 'max-width:100%; height:auto; border-radius:6px; margin:0.5em 0; background:#fff;',
    strong: 'font-weight:600;',
    em: 'font-style:italic;',
  },

  tech: {
    label: '科技',
    wrapperBg: 'bg-[#0a0e1a]',
    articleBg: 'bg-[#131826]',
    fg: 'text-[#e2e8f0]',
    accent: 'text-[#7dd3fc]',
    border: 'border-[#1e293b]',
    codeTheme: 'tech',
    bgHex: '#131826',
    fgHex: '#e2e8f0',
    accentHex: '#7dd3fc',
    borderHex: '#1e293b',
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
    base: 'line-height:1.75; font-size:16px;',
    h1: 'font-size:2.4rem; font-weight:700; margin:0 0 1.5rem; line-height:1.2; color:#7dd3fc; letter-spacing:-0.01em; padding:0.3rem 0 0.8rem; border-bottom:1px solid #1e293b;',
    h2: 'font-size:1.5rem; font-weight:600; margin:2.25rem 0 0.8rem; padding:0.4rem 0; border-left:4px solid #7dd3fc; background-color:rgba(125,211,252,0.08);',
    h3: 'font-size:1.2rem; font-weight:600; margin:1.75rem 0 0.6rem; padding:0.3rem 0; border-left:3px solid #a78bfa; color:#c4b5fd;',
    h4: 'font-size:1.05rem; font-weight:600; margin:1.5rem 0 0.4rem; color:#7dd3fc;',
    p: 'margin:1rem 0; line-height:1.8;',
    blockquote: 'border-left:4px solid #7dd3fc; padding:0.6rem 1rem; margin:1.25rem 0; background-color:rgba(125,211,252,0.08); border-radius:0 8px 8px 0; color:#cbd5e1;',
    code: 'background:#0f172a; color:#7dd3fc; padding:0.15rem 0.45rem; border-radius:4px; font-size:0.875em; font-family:ui-monospace,monospace; border:1px solid #1e293b;',
    pre: 'margin:1.25rem 0; padding:0; border-radius:8px; background:#0f172a; overflow:hidden;',
    preCode: 'color:#e2e8f0; padding:1rem 1.25rem; font-family:ui-monospace,monospace; font-size:0.875rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:1.75rem; margin:1rem 0;',
    ol: 'padding-left:1.75rem; margin:1rem 0;',
    li: 'margin:0.4rem 0; line-height:1.75;',
    table: 'border-collapse:collapse; width:100%; margin:1rem 0; border:1px solid #1e293b; font-size:0.95em;',
    th: 'border:1px solid #1e293b; padding:0.6rem 0.85rem; text-align:left; background-color:#1e293b; color:#7dd3fc; font-weight:600; text-transform:uppercase; font-size:0.85em; letter-spacing:0.05em;',
    td: 'border:1px solid #1e293b; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; height:1px; background-color:#1e293b; margin:2rem 0;',
    a: 'color:#7dd3fc; text-decoration:none; border-bottom:1px solid rgba(125,211,252,0.4);',
    img: 'max-width:100%; height:auto; border-radius:8px; margin:1rem 0; border:1px solid #1e293b;',
    strong: 'font-weight:700; color:#7dd3fc;',
    em: 'font-style:italic; color:#a78bfa;',
  },

  terminal: {
    label: '终端',
    wrapperBg: 'bg-black',
    articleBg: 'bg-[#0c0c0c]',
    fg: 'text-[#00ff88]',
    accent: 'text-[#ffcc00]',
    border: 'border-[#1a1a1a]',
    codeTheme: 'terminal',
    bgHex: '#0c0c0c',
    fgHex: '#00ff88',
    accentHex: '#ffcc00',
    borderHex: '#1a1a1a',
    font: 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace',
    base: 'line-height:1.65; font-size:14.5px;',
    h1: 'font-size:1.4rem; font-weight:700; margin:0 0 1.5rem; padding:0.4rem 0.8rem; color:#00ff88; background:#000; border:1px dashed #00ff88; text-transform:uppercase; letter-spacing:0.1em;',
    h2: 'font-size:1.15rem; font-weight:700; margin:1.75rem 0 0.6rem; padding:0.3rem 0.6rem; color:#ffcc00; background:#000; border-left:3px solid #ffcc00; text-transform:uppercase; letter-spacing:0.08em;',
    h3: 'font-size:1rem; font-weight:700; margin:1.5rem 0 0.5rem; color:#00ffff; text-transform:uppercase; letter-spacing:0.06em;',
    h4: 'font-size:0.9rem; font-weight:700; margin:1.25rem 0 0.4rem; color:#ff79c6; text-transform:uppercase;',
    p: 'margin:0.85rem 0; line-height:1.7;',
    blockquote: 'border-left:3px dashed #00ff88; padding:0.5rem 0 0.5rem 1rem; margin:1.25rem 0; background:rgba(0,255,136,0.04); color:#00ff88;',
    code: 'background:#000; color:#ffcc00; padding:0.1rem 0.4rem; border:1px solid #1a1a1a; font-size:0.875em; font-family:ui-monospace,monospace;',
    pre: 'margin:1.25rem 0; padding:0; background:#000; border:1px dashed #00ff88; overflow:hidden;',
    preCode: 'color:#00ff88; padding:0.85rem 1.1rem; font-family:ui-monospace,monospace; font-size:0.85rem; line-height:1.55; display:block; overflow-x:auto;',
    ul: 'padding-left:1.5rem; margin:0.85rem 0;',
    ol: 'padding-left:1.5rem; margin:0.85rem 0;',
    li: 'margin:0.3rem 0; line-height:1.65;',
    table: 'border-collapse:collapse; width:100%; margin:1rem 0; border:1px solid #00ff88; font-size:0.9em;',
    th: 'border:1px solid #00ff88; padding:0.5rem 0.75rem; text-align:left; background:#000; color:#ffcc00; font-weight:700; text-transform:uppercase;',
    td: 'border:1px solid #1a4a1a; padding:0.5rem 0.75rem; text-align:left;',
    hr: 'border:0; height:1rem; margin:1.5rem 0; text-align:center; color:#00ff88; background:transparent;',
    a: 'color:#ffcc00; text-decoration:underline; text-decoration-style:dotted;',
    img: 'max-width:100%; height:auto; border:1px dashed #00ff88; margin:1rem 0;',
    strong: 'font-weight:700; color:#ffcc00;',
    em: 'font-style:italic; color:#00ffff;',
  },

  sunset: {
    label: '日落',
    wrapperBg: 'bg-gradient-to-br from-orange-100 via-rose-100 to-pink-200',
    articleBg: 'bg-white',
    fg: 'text-[#4a2c2a]',
    accent: 'text-[#e85d4e]',
    border: 'border-orange-200',
    codeTheme: 'sunset',
    bgHex: '#ffffff',
    fgHex: '#4a2c2a',
    accentHex: '#e85d4e',
    borderHex: '#fed7aa',
    font: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    base: 'line-height:1.85; font-size:16px;',
    h1: 'font-size:2.2rem; font-weight:700; margin:0 0 1.5rem; padding:0.4rem 0 0.6rem; color:#e85d4e; letter-spacing:-0.01em; border-bottom:2px solid #fed7aa;',
    h2: 'font-size:1.5rem; font-weight:700; margin:2.25rem 0 0.8rem; padding:0.4rem 0; background-color:#fff7ed; border-radius:8px; border-left:5px solid #e85d4e; color:#c2410c;',
    h3: 'font-size:1.2rem; font-weight:600; margin:1.75rem 0 0.6rem; color:#e85d4e;',
    h4: 'font-size:1.05rem; font-weight:600; margin:1.5rem 0 0.4rem; color:#c2410c;',
    p: 'margin:0.9rem 0; line-height:1.85;',
    blockquote: 'border-left:5px solid #e85d4e; padding:0.7rem 1rem 0.7rem 1.2rem; margin:1.25rem 0; background-color:#fff7ed; border-radius:0 12px 12px 0; font-style:italic; color:#4a2c2a;',
    code: 'background-color:#fff7ed; color:#c2410c; padding:0.15rem 0.45rem; border-radius:6px; font-size:0.875em; font-family:ui-monospace,monospace; border:1px solid #fed7aa;',
    pre: 'margin:1.25rem 0; padding:0; border-radius:10px; background:#fff7ed; overflow:hidden;',
    preCode: 'color:#4a2c2a; padding:1rem 1.25rem; font-family:ui-monospace,monospace; font-size:0.875rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:1.75rem; margin:1rem 0;',
    ol: 'padding-left:1.75rem; margin:1rem 0;',
    li: 'margin:0.4rem 0; line-height:1.8;',
    table: 'border-collapse:separate; border-spacing:0; width:100%; margin:1rem 0; border:1.5px solid #fed7aa; border-radius:10px; overflow:hidden; font-size:0.95em;',
    th: 'border-bottom:1.5px solid #fed7aa; padding:0.6rem 0.85rem; text-align:left; background-color:#fed7aa; color:#c2410c; font-weight:700;',
    td: 'border-bottom:1px solid #fed7aa; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; height:1px; background-color:#fed7aa; margin:2rem 0;',
    a: 'color:#e85d4e; text-decoration:underline; padding:0 2px;',
    img: 'max-width:100%; height:auto; border-radius:12px; margin:1rem 0; border:1px solid #fed7aa;',
    strong: 'font-weight:700; color:#e85d4e;',
    em: 'font-style:italic; color:#c2410c;',
  },

  midnight: {
    label: '午夜',
    wrapperBg: 'bg-[#020617]',
    articleBg: 'bg-[#0f172a]',
    fg: 'text-[#cbd5e1]',
    accent: 'text-[#a78bfa]',
    border: 'border-[#1e293b]',
    codeTheme: 'midnight',
    bgHex: '#0f172a',
    fgHex: '#cbd5e1',
    accentHex: '#a78bfa',
    borderHex: '#1e293b',
    font: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    base: 'line-height:1.8; font-size:16px;',
    h1: 'font-size:2.3rem; font-weight:700; margin:0 0 1.5rem; line-height:1.2; color:#a78bfa; letter-spacing:-0.02em; padding:0.3rem 0 0.8rem; border-bottom:1px solid #1e293b;',
    h2: 'font-size:1.5rem; font-weight:600; margin:2.25rem 0 0.8rem; padding:0.4rem 0; border-left:4px solid #67e8f9; background-color:rgba(103,232,249,0.1); color:#67e8f9;',
    h3: 'font-size:1.2rem; font-weight:600; margin:1.75rem 0 0.6rem; padding:0.3rem 0; border-left:3px solid #a78bfa; color:#c4b5fd;',
    h4: 'font-size:1.05rem; font-weight:600; margin:1.5rem 0 0.4rem; color:#a78bfa;',
    p: 'margin:0.9rem 0; line-height:1.85;',
    blockquote: 'border-left:4px solid #a78bfa; padding:0.7rem 1rem; margin:1.25rem 0; background-color:rgba(167,139,250,0.08); border-radius:0 8px 8px 0; color:#cbd5e1;',
    code: 'background:#020617; color:#67e8f9; padding:0.15rem 0.45rem; border-radius:4px; font-size:0.875em; font-family:ui-monospace,monospace; border:1px solid #1e293b;',
    pre: 'margin:1.25rem 0; padding:0; border-radius:8px; background:#020617; overflow:hidden;',
    preCode: 'color:#cbd5e1; padding:1rem 1.25rem; font-family:ui-monospace,monospace; font-size:0.875rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:1.75rem; margin:1rem 0;',
    ol: 'padding-left:1.75rem; margin:1rem 0;',
    li: 'margin:0.4rem 0; line-height:1.8;',
    table: 'border-collapse:collapse; width:100%; margin:1rem 0; border:1px solid #1e293b; font-size:0.95em;',
    th: 'border:1px solid #1e293b; padding:0.6rem 0.85rem; text-align:left; background-color:#1e293b; color:#a78bfa; font-weight:600;',
    td: 'border:1px solid #1e293b; padding:0.55rem 0.85rem; text-align:left;',
    hr: 'border:0; height:1px; background-color:#1e293b; margin:2rem 0;',
    a: 'color:#67e8f9; text-decoration:none; border-bottom:1px solid rgba(103,232,249,0.4);',
    img: 'max-width:100%; height:auto; border-radius:8px; margin:1rem 0; border:1px solid #1e293b;',
    strong: 'font-weight:700; color:#a78bfa;',
    em: 'font-style:italic; color:#67e8f9;',
  },

  academic: {
    label: '学术',
    wrapperBg: 'bg-[#f5f1ea]',
    articleBg: 'bg-[#fdfcfa]',
    fg: 'text-[#1a1a1a]',
    accent: 'text-[#1e40af]',
    border: 'border-[#d6cfbf]',
    codeTheme: 'academic',
    bgHex: '#fdfcfa',
    fgHex: '#1a1a1a',
    accentHex: '#1e40af',
    borderHex: '#d6cfbf',
    font: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif',
    base: 'line-height:1.8; font-size:16px;',
    h1: 'font-family:Georgia,"Songti SC",serif; font-size:2.1rem; font-weight:700; margin:0 0 2rem; padding:0 0 0.8rem; text-align:center; border-bottom:3px double #1e40af; letter-spacing:0.04em;',
    h2: 'font-family:Georgia,serif; font-size:1.45rem; font-weight:700; margin:2.25rem 0 0.8rem; padding:0 0 0.3rem; border-bottom:1px solid #1a1a1a;',
    h3: 'font-family:Georgia,serif; font-size:1.2rem; font-weight:700; font-style:italic; margin:1.75rem 0 0.5rem;',
    h4: 'font-family:Georgia,serif; font-size:1.05rem; font-weight:700; margin:1.5rem 0 0.4rem;',
    p: 'margin:0.9rem 0; line-height:1.85; text-align:justify; text-indent:2em;',
    blockquote: 'border-left:3px double #1e40af; padding:0.5rem 0 0.5rem 1.25rem; margin:1.5rem 1.5rem 1.5rem 1.5rem; font-family:Georgia,serif; font-style:italic; color:#1a1a1a; background:rgba(30,64,175,0.03);',
    code: 'font-family:"Courier New",Consolas,monospace; background:#faf8f3; color:#1e40af; padding:0.1rem 0.4rem; border-radius:2px; font-size:0.9em; border:1px solid #d6cfbf;',
    pre: 'margin:1.5rem 0; padding:0; border-radius:6px; background:#faf8f3; overflow:hidden;',
    preCode: 'color:#1a1a1a; padding:0.9rem 1.1rem; font-family:"Courier New",Consolas,monospace; font-size:0.875rem; line-height:1.65; display:block; overflow-x:auto;',
    ul: 'padding-left:2rem; margin:0.9rem 0;',
    ol: 'padding-left:2rem; margin:0.9rem 0;',
    li: 'margin:0.35rem 0; line-height:1.75;',
    table: 'border-collapse:collapse; width:100%; margin:1.5rem 0; border-top:2px solid #1a1a1a; border-bottom:2px solid #1a1a1a; font-family:Georgia,serif; font-size:0.95em;',
    th: 'border-top:1px solid #1a1a1a; border-bottom:1px solid #1a1a1a; padding:0.5rem 0.75rem; text-align:left; font-weight:700; background:rgba(30,64,175,0.05);',
    td: 'border-bottom:1px solid #d6cfbf; padding:0.5rem 0.75rem; text-align:left;',
    hr: 'border:0; height:1rem; margin:1.75rem 0; text-align:center; color:#1a1a1a; background:transparent;',
    a: 'color:#1e40af; text-decoration:underline; text-underline-offset:2px;',
    img: 'max-width:100%; height:auto; border:1px solid #1a1a1a; margin:1rem 0; padding:4px; background:#fff;',
    strong: 'font-weight:700;',
    em: 'font-style:italic;',
  },
};

const HLJS_THEMES: Record<string, string> = {
  paper: `
    .hljs { color: #e8d9b8; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #ffb86c; }
    .hljs-string, .hljs-attr { color: #a8c66c; }
    .hljs-number, .hljs-literal { color: #ff79c6; }
    .hljs-comment { color: #8b7d5e; font-style: italic; }
    .hljs-function, .hljs-title { color: #6fb3d2; }
    .hljs-tag { color: #ffb86c; }
    .hljs-name { color: #ff79c6; }
  `,
  tech: `
    .hljs { color: #e2e8f0; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #c084fc; }
    .hljs-string, .hljs-attr { color: #86efac; }
    .hljs-number, .hljs-literal { color: #fbbf24; }
    .hljs-comment { color: #64748b; font-style: italic; }
    .hljs-function, .hljs-title { color: #7dd3fc; }
    .hljs-tag { color: #c084fc; }
    .hljs-name { color: #fbbf24; }
    .hljs-variable, .hljs-attribute { color: #f9a8d4; }
  `,
  wechat: `
    .hljs { color: #353535; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #d73a49; }
    .hljs-string, .hljs-attr { color: #22863a; }
    .hljs-number, .hljs-literal { color: #005cc5; }
    .hljs-comment { color: #6a737d; font-style: italic; }
    .hljs-function, .hljs-title { color: #6f42c1; }
    .hljs-tag { color: #22863a; }
    .hljs-name { color: #d73a49; }
  `,
  xiaohongshu: `
    .hljs { color: #2d2d2d; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #ff2442; }
    .hljs-string, .hljs-attr { color: #ff6b9d; }
    .hljs-number, .hljs-literal { color: #ff8c00; }
    .hljs-comment { color: #d49ba8; font-style: italic; }
    .hljs-function, .hljs-title { color: #c026d3; }
  `,
  notion: `
    .hljs { color: #37352f; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #2eaadc; font-weight: 600; }
    .hljs-string, .hljs-attr { color: #0f7b6c; }
    .hljs-number, .hljs-literal { color: #b35488; }
    .hljs-comment { color: #9b9a97; font-style: italic; }
    .hljs-function, .hljs-title { color: #64473a; }
    .hljs-tag { color: #64473a; }
  `,
  github: `
    .hljs { color: #24292f; }
    .dark .hljs { color: #e6edf3; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #cf222e; }
    .dark .hljs-keyword, .dark .hljs-selector-tag, .dark .hljs-built_in { color: #ff7b72; }
    .hljs-string, .hljs-attr { color: #0a3069; }
    .dark .hljs-string, .dark .hljs-attr { color: #a5d6ff; }
    .hljs-number, .hljs-literal { color: #0550ae; }
    .dark .hljs-number, .dark .hljs-literal { color: #79c0ff; }
    .hljs-comment { color: #6e7781; font-style: italic; }
    .hljs-function, .hljs-title { color: #8250df; }
    .dark .hljs-function, .dark .hljs-title { color: #d2a8ff; }
  `,
  terminal: `
    .hljs { color: #00ff88; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #ffcc00; font-weight: 600; }
    .hljs-string, .hljs-attr { color: #00ffff; }
    .hljs-number, .hljs-literal { color: #ff79c6; }
    .hljs-comment { color: #555; font-style: italic; }
    .hljs-function, .hljs-title { color: #ff5555; }
    .hljs-tag { color: #ffcc00; }
    .hljs-name { color: #ff79c6; }
  `,
  sunset: `
    .hljs { color: #4a2c2a; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #e85d4e; }
    .hljs-string, .hljs-attr { color: #c2410c; }
    .hljs-number, .hljs-literal { color: #b45309; }
    .hljs-comment { color: #b89a8a; font-style: italic; }
    .hljs-function, .hljs-title { color: #9a3412; }
    .hljs-tag { color: #e85d4e; }
  `,
  midnight: `
    .hljs { color: #cbd5e1; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #a78bfa; }
    .hljs-string, .hljs-attr { color: #67e8f9; }
    .hljs-number, .hljs-literal { color: #fbbf24; }
    .hljs-comment { color: #64748b; font-style: italic; }
    .hljs-function, .hljs-title { color: #93c5fd; }
    .hljs-tag { color: #a78bfa; }
    .hljs-name { color: #fbbf24; }
  `,
  academic: `
    .hljs { color: #1a1a1a; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #1e40af; font-weight: 600; }
    .hljs-string, .hljs-attr { color: #166534; }
    .hljs-number, .hljs-literal { color: #b91c1c; }
    .hljs-comment { color: #6b6b6b; font-style: italic; }
    .hljs-function, .hljs-title { color: #7c2d12; }
    .hljs-tag { color: #1e40af; }
    .hljs-name { color: #b91c1c; }
  `,
};

interface Props {
  markdown: string;
  theme: PreviewTheme;
  platformStyle?: string;
}

export function ArticleRenderer({ markdown, theme, platformStyle }: Props) {
  const t = THEME_PROFILES[theme];

  const html = useMemo(() => {
    try {
      const raw = marked.parse(markdown || '', { async: false }) as string;
      // marked 会在代码块结尾追加一个 \n，导致渲染时多出空行；这里去掉
      return raw.replace(/(<pre><code[^>]*>[\s\S]*?)\s+<\/code><\/pre>/g, '$1</code></pre>');
    } catch {
      return '';
    }
  }, [markdown]);

  // 生成主题专属 CSS：完全替换基础样式，确保每个 markdown 元素在不同主题下视觉差异巨大
  const themeCSS = useMemo(() => {
    const styles = `
      .article-body[data-style="${theme}"] { font-family:${t.font}; ${t.base} color:${t.fgHex}; background:${t.bgHex}; }
      .article-body[data-style="${theme}"] h1 { ${t.h1} }
      .article-body[data-style="${theme}"] h2 { ${t.h2} }
      .article-body[data-style="${theme}"] h3 { ${t.h3} }
      .article-body[data-style="${theme}"] h4 { ${t.h4} }
      .article-body[data-style="${theme}"] p { ${t.p} }
      .article-body[data-style="${theme}"] blockquote { ${t.blockquote} }
      .article-body[data-style="${theme}"] code { ${t.code} }
      .article-body[data-style="${theme}"] pre { ${t.pre} }
      .article-body[data-style="${theme}"] pre code.hljs { ${t.preCode} }
      .article-body[data-style="${theme}"] ul { ${t.ul} }
      .article-body[data-style="${theme}"] ol { ${t.ol} }
      .article-body[data-style="${theme}"] li { ${t.li} }
      .article-body[data-style="${theme}"] li > p { margin: 0.2rem 0; }
      .article-body[data-style="${theme}"] table { ${t.table} }
      .article-body[data-style="${theme}"] th { ${t.th} }
      .article-body[data-style="${theme}"] td { ${t.td} }
      .article-body[data-style="${theme}"] hr { ${t.hr} }
      .article-body[data-style="${theme}"] a { ${t.a} }
      .article-body[data-style="${theme}"] a:hover { opacity: 0.75; }
      .article-body[data-style="${theme}"] img { ${t.img} }
      .article-body[data-style="${theme}"] strong { ${t.strong} }
      .article-body[data-style="${theme}"] em { ${t.em} }
      .article-body[data-style="${theme}"] del { opacity: 0.6; }
    `;
    return styles;
  }, [theme, t]);

  return (
    <>
      <style>{HLJS_THEMES[t.codeTheme]}</style>
      <div className={cn('overflow-auto h-full p-8', t.wrapperBg)}>
        <article
          className={cn('article-body max-w-3xl mx-auto rounded-lg p-10', t.articleBg, t.fg)}
          data-style={theme}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{themeCSS}</style>
    </>
  );
}