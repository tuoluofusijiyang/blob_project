# 内容生成 tools 设计文档

**日期**：2026-06-19
**状态**：设计稿（待用户确认）
**作者**：与用户协作设计

---

## 1. 项目定位

**名称**：内容生成 tools

**一句话描述**：本地运行的桌面级 CLI 工具，启动后通过浏览器访问，帮助内容创作者一键生成多平台、多风格、带配图的文章草稿。

**核心价值**：让 1 小时写 1 篇的创作者，1 小时产出 5 篇高质量草稿。

**不做的事**（明确边界）：
- ❌ 不自动发布到任何平台
- ❌ 不抓取热点数据
- ❌ 不做账号矩阵管理
- ❌ 不做数据追踪/分析
- ❌ 不强制联网（除 AI 调用和 License 验证）

---

## 2. 用户画像与场景

**目标用户**：
- 个人/小团队内容创作者
- 同时运营 2-5 个平台（公众号、CSDN、掘金、小红书、知乎等）
- 有 1-2 小时/天创作时间
- 愿意使用 AI 工具辅助但不完全依赖

**典型场景**：
1. 早上想好今天写的主题 → 启动 CLI → 浏览器打开
2. 选择分类（AI/科技/母婴等）→ 选模型 → 输入主题
3. 5 分钟内拿到大纲 → 30 秒确认
4. 3-5 分钟拿到正文 + 配图 → 30 秒调整
5. 选择目标平台 → 一键复制 → 去对应平台粘贴发布

---

## 3. 整体架构

### 3.1 三层架构

```
┌─────────────────────────────────────────┐
│ CLI 启动器                              │
│   - Bun --compile 打包                  │
│   - 入口 yourtool / yourtool.exe        │
│   - 固定端口 7842                        │
│   - 单实例（mutex 锁）                   │
│   - 自动打开浏览器 + 显示链接            │
└─────────────────────────────────────────┘
                  ↓ 启动
┌─────────────────────────────────────────┐
│ Next.js 15 全栈应用（localhost:7842）   │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Web UI       │  │ API Routes      │  │
│  │ (shadcn/ui)  │  │ (服务端逻辑)     │  │
│  └──────────────┘  └─────────────────┘  │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ AI Provider  │  │ Format Adapter  │  │
│  │ (多模型抽象)  │  │ (平台格式转换)  │  │
│  └──────────────┘  └─────────────────┘  │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ SQLite (本地文件)                  │ │
│  │ - 用户表 / 草稿表 / 配置表        │ │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓ 调用
┌─────────────────────────────────────────┐
│ 外部服务（用户自己提供 API Key）         │
│   - OpenAI / Anthropic / DeepSeek 等   │
│   - DALL-E / Midjourney / 通义万相等   │
└─────────────────────────────────────────┘
```

### 3.2 目录结构

```
content-tools/
├── bin/
│   └── cli.ts                  # CLI 入口（被 Bun --compile）
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── generate/page.tsx
│   │   │   ├── drafts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── settings/
│   │   │       ├── providers/page.tsx
│   │   │       ├── models/page.tsx
│   │   │       ├── account/page.tsx
│   │   │       └── preferences/page.tsx
│   │   ├── api/                # API Routes
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/             # React 组件
│   │   ├── ui/                # shadcn/ui 基础组件
│   │   ├── generate/          # 生成向导相关
│   │   ├── draft/             # 草稿管理相关
│   │   └── settings/          # 设置相关
│   ├── lib/
│   │   ├── db/                # 数据库
│   │   │   ├── schema.ts      # Drizzle Schema
│   │   │   ├── client.ts      # DB 客户端
│   │   │   └── migrations/    # 迁移
│   │   ├── ai/                # AI Provider
│   │   │   ├── base.ts        # 接口定义
│   │   │   ├── openai.ts      # OpenAI 兼容实现
│   │   │   ├── anthropic.ts   # Claude 实现
│   │   │   ├── replicate.ts   # Replicate 实现
│   │   │   └── volcengine.ts  # 火山方舟实现
│   │   ├── auth/              # 认证
│   │   │   ├── password.ts    # argon2
│   │   │   ├── session.ts     # 会话管理
│   │   │   └── middleware.ts  # 路由保护
│   │   ├── format/            # 平台格式适配
│   │   │   ├── base.ts
│   │   │   ├── wechat.ts
│   │   │   ├── csdn.ts
│   │   │   ├── juejin.ts
│   │   │   ├── xiaohongshu.ts
│   │   │   └── zhihu.ts
│   │   ├── generate/          # 内容生成
│   │   │   ├── engine.ts      # 主流程
│   │   │   ├── outline.ts     # 大纲生成
│   │   │   ├── article.ts     # 正文生成
│   │   │   └── image.ts       # 图片生成
│   │   ├── keychain/          # 加密存储
│   │   │   └── index.ts
│   │   └── utils/
│   ├── prompts/               # 提示词模板
│   │   ├── categories/
│   │   │   ├── ai.ts
│   │   │   ├── tech.ts
│   │   │   ├── mom-baby.ts
│   │   │   ├── life.ts
│   │   │   ├── career.ts
│   │   │   ├── emotion.ts
│   │   │   ├── food.ts
│   │   │   └── education.ts
│   │   └── formats/
│   │       ├── outline.ts
│   │       ├── article.ts
│   │       ├── title.ts
│   │       └── image-prompt.ts
│   └── types/
├── data/                      # 运行时数据（gitignore）
│   ├── content-tools.db       # SQLite
│   └── images/                # 生成的图片
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── README.md
```

---

## 4. 数据模型

SQLite 文件位置：
- macOS/Linux: `~/.content-tools/data.db`
- Windows: `%APPDATA%/content-tools/data.db`

### 4.1 表结构

```sql
-- 用户表
users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,             -- argon2 哈希
  email           TEXT,
  display_name    TEXT,
  role            TEXT DEFAULT 'user',       -- 'admin' | 'user'
  is_active       INTEGER DEFAULT 1,
  created_at      INTEGER NOT NULL,
  last_login_at   INTEGER
)

-- 会话表（Auth.js session）
sessions (
  id              TEXT PRIMARY KEY,          -- session token
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at      INTEGER NOT NULL,
  data            TEXT                       -- JSON
)

-- AI Provider 配置
ai_providers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,             -- 'openai' | 'anthropic' | 'replicate' | 'volcengine'
  name            TEXT NOT NULL,             -- 用户自定义名称
  api_key_ref     TEXT NOT NULL,             -- Keychain 引用 key（实际 key 在 OS Keychain）
  base_url        TEXT,                      -- 自定义端点
  enabled         INTEGER DEFAULT 1,
  created_at      INTEGER NOT NULL
)

-- AI 模型
ai_models (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id     INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id        TEXT NOT NULL,             -- 'gpt-4' | 'claude-sonnet-4-6' | ...
  type            TEXT NOT NULL,             -- 'text' | 'image'
  display_name    TEXT,
  enabled         INTEGER DEFAULT 1
)

-- 分类
categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL,             -- 'ai' | 'tech' | 'mom-baby' | ...
  name            TEXT NOT NULL,             -- 显示名
  icon            TEXT,                      -- emoji 或 lucide icon name
  description     TEXT,
  is_builtin      INTEGER DEFAULT 0,         -- 预置不可删
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL=预置
  sort_order      INTEGER DEFAULT 0,
  enabled         INTEGER DEFAULT 1
)

-- 提示词模板
prompt_templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  template_type   TEXT NOT NULL,             -- 'outline' | 'article' | 'image-prompt' | 'title'
  name            TEXT NOT NULL,
  template        TEXT NOT NULL,             -- 含 {{variables}} 的模板
  variables       TEXT,                      -- JSON: ['topic', 'keywords', ...]
  is_builtin      INTEGER DEFAULT 0
)

-- 草稿
drafts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     INTEGER NOT NULL REFERENCES categories(id),
  title           TEXT,
  content_md      TEXT,                      -- Markdown 原文
  content_html    TEXT,                      -- 渲染后 HTML
  platform        TEXT,                      -- 'wechat' | 'csdn' | 'juejin' | 'xiaohongshu' | 'zhihu'
  status          TEXT DEFAULT 'draft',      -- 'draft' | 'finalized' | 'archived'
  cover_image_id  INTEGER REFERENCES generated_images(id),
  metadata        TEXT,                      -- JSON: 字数、生成耗时、tokens 等
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
)

-- 草稿-图片关联
draft_images (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id        INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  image_id        INTEGER NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,          -- 在文中位置（段落索引）
  caption         TEXT                       -- AI 生成的图说
)

-- 生成的图片
generated_images (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,             -- data/images/xxx.png
  prompt          TEXT,                      -- 使用的提示词
  model_id        INTEGER REFERENCES ai_models(id),
  width           INTEGER,
  height          INTEGER,
  file_size       INTEGER,
  created_at      INTEGER NOT NULL
)

-- 平台格式配置
platform_formats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT UNIQUE NOT NULL,      -- 'wechat' | 'csdn' | ...
  name            TEXT NOT NULL,
  output_format   TEXT NOT NULL,             -- 'markdown' | 'rich-text' | 'plain'
  style_guide     TEXT,                      -- 风格指南文本
  word_min        INTEGER,
  word_max        INTEGER,
  image_rules     TEXT,                      -- JSON: 图片尺寸、位置等规则
  is_builtin      INTEGER DEFAULT 1
)

-- 用户偏好设置
user_settings (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_text_provider_id   INTEGER REFERENCES ai_providers(id),
  default_text_model_id     INTEGER REFERENCES ai_models(id),
  default_image_provider_id INTEGER REFERENCES ai_providers(id),
  default_image_model_id    INTEGER REFERENCES ai_models(id),
  default_platform          TEXT,
  theme                     TEXT DEFAULT 'system',
  language                  TEXT DEFAULT 'zh-CN'
)

-- 操作日志
activity_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,             -- 'login' | 'logout' | 'generate' | 'export' | 'delete' | ...
  resource_type   TEXT,
  resource_id     INTEGER,
  details         TEXT,                      -- JSON
  ip              TEXT,
  user_agent      TEXT,
  created_at      INTEGER NOT NULL
)

-- 草稿版本快照（保留最近 5 个）
draft_versions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id        INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  content_md      TEXT NOT NULL,
  content_html    TEXT,
  metadata        TEXT,                      -- JSON: 完整 metadata 快照
  created_at      INTEGER NOT NULL
)

-- License Key（V2 用，V1 预留）
licenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key     TEXT UNIQUE NOT NULL,
  user_id         INTEGER REFERENCES users(id),
  plan            TEXT,                      -- 'free' | 'pro' | 'team'
  expires_at      INTEGER,
  activated_at    INTEGER,
  last_verified_at INTEGER,
  metadata        TEXT                       -- JSON: 购买信息等
)
```

### 4.2 设计原则

1. **用户隔离**：所有业务表都有 `user_id`，查询强制带 WHERE
2. **API Key 加密**：实际 key 存 OS Keychain，DB 仅存引用
3. **草稿双格式**：Markdown 原文 + 渲染 HTML（导出免重新渲染）
4. **图片位置可控**：`draft_images.position` 字段，AI 建议后用户可调整
5. **预置分类保护**：`is_builtin=1` 不允许删除/修改 slug
6. **审计日志**：登录、生成、导出、删除等敏感操作全部记录
7. **软删除**：`is_active` / `status` 标记，不真删数据

### 4.3 索引

```sql
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_ai_providers_user ON ai_providers(user_id);
CREATE INDEX idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX idx_drafts_user ON drafts(user_id);
CREATE INDEX idx_drafts_user_updated ON drafts(user_id, updated_at DESC);
CREATE INDEX idx_draft_images_draft ON draft_images(draft_id, position);
CREATE INDEX idx_generated_images_user ON generated_images(user_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action, created_at);
CREATE INDEX idx_draft_versions_draft ON draft_versions(draft_id, version_number DESC);
```

---

## 5. AI Provider 抽象

### 5.1 接口定义

```typescript
// src/lib/ai/base.ts

export interface TextGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  signal?: AbortSignal;
}

export interface TextGenerateChunk {
  type: 'text' | 'reasoning' | 'usage';
  content?: string;
  // usage 信息在最后一个 chunk 返回
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface TextProvider {
  generateStream(params: TextGenerateParams): AsyncIterable<TextGenerateChunk>;
  listModels(): Promise<ModelInfo[]>;
}

// src/lib/ai/image.ts

export interface ImageGenerateParams {
  prompt: string;
  model: string;
  width: number;
  height: number;
  n?: number;
  negativePrompt?: string;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  url?: string;          // 远程 URL（如果 provider 返回）
  base64?: string;       // 或者 base64
  revisedPrompt?: string;
}

export interface ImageProvider {
  generate(params: ImageGenerateParams): Promise<GeneratedImage[]>;
  listModels(): Promise<ModelInfo[]>;
}

export interface ModelInfo {
  id: string;
  displayName: string;
  type: 'text' | 'image';
  contextWindow?: number;
  description?: string;
}
```

### 5.2 内置实现

| Provider | 类型 | 协议 | 覆盖模型 |
|---|---|---|---|
| `OpenAICompatibleProvider` | text + image | OpenAI Chat Completions + Images API | OpenAI、DeepSeek、Moonshot、通义千问、智谱等 |
| `AnthropicProvider` | text | Anthropic Messages API | Claude 全系列 |
| `ReplicateProvider` | image | Replicate HTTP API | Stable Diffusion、Midjourney、Flux 等 |
| `VolcengineProvider` | text + image | 火山方舟 OpenAI 兼容 | 豆包系列 |

### 5.3 Provider 注册机制

用户在 `/settings/providers` 添加：
1. 选类型（OpenAI 兼容 / Anthropic / Replicate / 火山）
2. 填显示名 + API Key + base_url（可选）
3. 系统自动调用 `listModels()` 列出可用模型
4. 用户勾选要启用的模型
5. 写入 DB（Key 进 OS Keychain）

### 5.4 重试与错误处理

- 指数退避重试（最多 3 次）
- 超时设置（text 默认 60s，image 默认 120s）
- 流式中断时记录进度，用户可"继续生成"
- 错误分类：
  - 网络错误：自动重试
  - 401/403：提示 Key 错误，不重试
  - 429：等待 Retry-After 后重试
  - 5xx：重试 3 次后报错

---

## 6. 内容生成流程

### 6.1 总流程

```
[Step 1] 选择分类
[Step 2] 选择模型（文本 + 图像）
[Step 3] 输入主题 + 关键词 + 字数
[Step 4] 生成大纲（AI）→ 用户可编辑
[Step 5] 生成正文（AI 流式）→ 用户可中断/编辑
[Step 6] 生成图片提示词（AI）→ 自动
[Step 7] 并发生成图片（AI）→ 进度条
[Step 8] AI 建议插图位置 → 用户可拖拽调整
[Step 9] 选择目标平台 → 格式化输出
[Step 10] 保存草稿 + 一键复制
```

### 6.2 每个 Step 的实现

**Step 4 大纲生成**：
- 用 category 的 `outline_template` 渲染提示词
- 调用 text provider（非流式，返回结构化 JSON）
- JSON Schema：
  ```typescript
  {
    title: string;
    sections: Array<{
      heading: string;
      points: string[];
    }>;
  }
  ```
- 解析失败时回退为文本大纲

**Step 5 正文生成**：
- 用 `article_template` + 大纲渲染提示词
- 调用 text provider 流式
- 边接收边存草稿（每 100 字一次）
- 支持 AbortController 中断

**Step 6-7 图片生成**：
- 用 `image_prompt_template` 生成 N 个图提示词（N = 目标图片数）
- 并发调用 image provider（最多 3 并发）
- 保存到 `data/images/{draft_id}/`
- 失败的图片不阻塞主流程

**Step 8 插图位置**：
- 启发式：按段落匹配关键词
- 简单算法：图 prompt 关键词与段落相似度，取 top N
- 用户可拖拽排序

**Step 9 平台格式化**：
- 调用对应 adapter
- adapter 输出对应格式（HTML/Markdown/Plain）
- 复制到剪贴板（用 Clipboard API）

### 6.3 提示词模板

`src/prompts/categories/ai.ts` 示例：

```typescript
export const aiPrompts = {
  outline: `
你是一个 AI 领域内容创作者。基于以下主题生成文章大纲。

主题：{{topic}}
关键词：{{keywords}}
目标字数：{{wordCount}}

要求：
- 结构清晰，3-5 个章节
- 每个章节 2-4 个要点
- 适合 {{platform}} 平台风格

输出 JSON 格式：
{
  "title": "...",
  "sections": [
    { "heading": "...", "points": ["...", "..."] }
  ]
}
  `.trim(),

  article: `
你是一个 AI 领域内容创作者。基于以下大纲写一篇完整文章。

大纲：
{{outline}}

要求：
- 字数 {{wordCount}} 左右
- 风格：专业但易懂
- 适当使用 Markdown 格式
- 适合 {{platform}} 平台
- 不要 AI 套话（"在当今时代..."、"总而言之..."）

直接输出正文，不要前言。
  `.trim(),

  imagePrompt: `
为主题"{{topic}}"生成 {{count}} 个图片提示词。

要求：
- 简洁（< 200 字）
- 描述具体场景，避免抽象
- 适合文生图模型
- 中文输出

输出 JSON：["prompt1", "prompt2", ...]
  `.trim(),
};
```

---

## 7. 平台格式适配

### 7.1 接口

```typescript
// src/lib/format/base.ts

export interface ArticleContent {
  title: string;
  markdown: string;
  images: Array<{
    url: string;          // 本地文件路径或 data URL
    alt: string;
    caption?: string;
    width: number;
    height: number;
  }>;
  metadata: {
    author?: string;
    summary?: string;
    tags?: string[];
  };
}

export interface FormattedOutput {
  format: 'markdown' | 'html' | 'plain';
  content: string;
  warnings: string[];        // 平台不兼容的项提示
}

export interface PlatformAdapter {
  slug: string;
  name: string;
  format(content: ArticleContent, options?: any): Promise<FormattedOutput>;
  validate(content: ArticleContent): string[];  // 返回警告
}
```

### 7.2 平台规范

| 平台 | 输出格式 | 关键规则 |
|---|---|---|
| 微信公众号 | HTML（富文本） | 图片 ≤ 900px、首行缩进 2em、段落短、字号 16px |
| CSDN | Markdown | 标准 MD、支持代码高亮、推荐结构、目录 |
| 掘金 | Markdown | 技术风格、emoji 友好、代码块必填 |
| 小红书 | 富文本 + emoji | 短句（< 50 字）、emoji 多、首图关键、口语化 |
| 知乎 | Markdown | 长文、结构清晰、引用块、LaTeX 支持 |
| Markdown（通用） | Markdown | 标准 MD、原样输出 |

### 7.3 适配器实现要点

**WechatAdapter**：
- Markdown → HTML（用 marked + 自定义渲染器）
- 图片压缩到 ≤ 900px
- 段落样式：`<p style="text-indent:2em;">`
- 字号：`<span style="font-size:16px;">`

**XiaohongshuAdapter**：
- 段落拆分（每段 ≤ 50 字）
- emoji 强化
- 标题加粗、关键句用 ⭐ 包裹

---

## 8. 图片生成与插图

### 8.1 封面图

- 默认 16:9（公众号/掘金友好）
- AI prompt 自动优化（基于文章主题）
- 提供 preset 风格：写实/插画/扁平/3D
- 用户可：重新生成 / 手动上传 / 选择预设图

### 8.2 内文配图

- 每篇 3-8 张（用户设置）
- AI 根据正文段落匹配（关键词相似度）
- 用户可：
  - 拖拽改变位置（草稿编辑器左侧大纲，右侧图库，中间文章）
  - 删除/替换某张
  - 重新生成某张
  - 调整图说（caption）

### 8.3 存储

- 路径：`data/images/{user_id}/{draft_id}/{uuid}.{ext}`
- 元数据存 `generated_images` 表
- 30 天未引用自动清理（V2 加）

### 8.4 风格控制

```
写实 (photorealistic)        - "photorealistic, high quality, 8k"
插画 (illustration)          - "illustration, digital art, vibrant"
扁平 (flat)                  - "flat design, vector, minimal"
3D 渲染 (3d-render)          - "3d render, octane, detailed"
水彩 (watercolor)            - "watercolor, soft, artistic"
```

---

## 9. CLI 启动器

### 9.1 实现

```typescript
// bin/cli.ts

import { spawn } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import open from 'open';  // 跨平台打开浏览器

const PORT = 7842;
const DATA_DIR = join(homedir(), '.content-tools');

async function main() {
  // 1. 数据目录
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    await initDatabase();
    console.log('✨ 首次启动，数据目录已创建：', DATA_DIR);
    console.log('📝 请访问 http://localhost:7842 创建管理员账户\n');
  }

  // 2. 端口检测（单实例）
  const inUse = await isPortInUse(PORT);
  if (inUse) {
    console.error(`❌ 端口 ${PORT} 已被占用`);
    console.error('   可能另一个实例正在运行，请先关闭');
    process.exit(1);
  }

  // 3. 启动 Next.js
  console.log('🚀 正在启动内容生成 tools...\n');
  const server = spawn({
    cmd: ['bun', 'run', 'server.ts'],
    env: { ...process.env, PORT: String(PORT), DATA_DIR },
    stdout: 'inherit',
    stderr: 'inherit',
  });

  // 4. 等待服务就绪
  await waitForServer(`http://localhost:${PORT}`, 30000);

  // 5. 输出信息
  console.log(`
┌──────────────────────────────────┐
│  🚀 内容生成 tools 已启动         │
│                                  │
│  URL: http://localhost:${PORT}   │
│                                  │
│  浏览器已自动打开                 │
│  按 Ctrl+C 退出                   │
└──────────────────────────────────┘
  `);

  // 6. 打开浏览器
  try {
    await open(`http://localhost:${PORT}`);
  } catch (err) {
    console.log('（无法自动打开浏览器，请手动访问上述 URL）');
  }

  // 7. 优雅退出
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭...');
    server.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('启动失败：', err);
  process.exit(1);
});
```

### 9.2 跨平台注意事项

- Windows：用 `concurrently` 或类似工具
- macOS：用 `open` 命令打开浏览器
- Linux：`xdg-open`
- 用 `open` npm 包统一处理

---

## 10. 打包与分发

### 10.1 Bun --compile 命令

```bash
# macOS Apple Silicon
bun build --compile --target=bun-darwin-arm64 ./bin/cli.ts --outfile dist/content-tools-mac-arm64

# macOS Intel
bun build --compile --target=bun-darwin-x64 ./bin/cli.ts --outfile dist/content-tools-mac-x64

# Windows
bun build --compile --target=bun-windows-x64 ./bin/cli.ts --outfile dist/content-tools.exe

# Linux x64
bun build --compile --target=bun-linux-x64 ./bin/cli.ts --outfile dist/content-tools-linux
```

### 10.2 分发

- **V1**：GitHub Releases，每个平台一个 asset
- **V2**：自建下载站 + License Key 激活

### 10.3 License Key 机制（V2）

- 购买后获得 key：`XXXX-XXXX-XXXX-XXXX`
- 首次启动输入 → 联网验证 → 写入本地 SQLite
- 离线宽限期：30 天
- V2 早期不强制阻断过期（友好策略）

---

## 11. UI 设计

### 11.1 设计原则

1. **shadcn/ui 为基础**：所有 UI 组件用 shadcn/ui + Tailwind
2. **现代审美**：参考 Linear、Vercel、Cursor 的视觉风格
3. **响应式**：桌面优先（最小宽度 1024px），移动端基本可用
4. **暗色模式**：跟随系统，可手动切换
5. **中文优先**：所有文案中文，但保留 i18n 能力

### 11.2 关键页面

**登录页**：
- 居中卡片
- 用户名 + 密码
- 主题切换按钮

**注册页**（仅管理员）：
- 第一个用户自动成为管理员
- 之后注册需要管理员审核（V2）

**仪表盘**：
- 顶部：欢迎语 + 今日统计
- 主体：最近 10 篇草稿
- 右侧快捷入口：新建草稿、设置

**生成向导**（核心页面）：
```
[顶部进度条]
1 ▰▰▰▰▰▱▱▱▱▱ 5%

[Step 1: 选分类]
  卡片网格，每个分类带 emoji、名称、描述
  
[Step 2: 选模型]
  下拉 + 配置入口
  
[Step 3: 主题输入]
  大输入框 + 关键词标签输入 + 字数滑块
  
[Step 4: 大纲]
  左右分栏：左边大纲（可编辑），右边预览

[Step 5: 正文]
  大文本区，流式显示，支持中断

[Step 6-7: 图片]
  进度条 + 已生成图片缩略图

[Step 8: 调整]
  拖拽编辑器：左侧大纲、中间文章、右侧图库

[Step 9-10: 完成]
  平台选择 + 预览 + 复制按钮
```

**草稿列表**：
- 表格视图：标题、分类、平台、更新时间、字数
- 搜索 + 分类筛选 + 平台筛选
- 批量操作（删除、导出）

**草稿详情**：
- 大编辑器（支持 MD 切换）
- 左侧：大纲导航
- 右侧：图片、平台、设置
- 顶部：标题、状态、保存按钮

**设置**：
- AI Providers：列表 + 添加/编辑/删除
- 模型：每个 Provider 下的模型启用/禁用
- 账户：修改密码、显示名
- 偏好：主题、语言、默认值

### 11.3 关键组件

| 组件 | 用途 |
|---|---|
| `<GeneratorWizard />` | 生成向导主组件 |
| `<StepCategory />` | 选分类卡片网格 |
| `<StepModels />` | 模型选择器 |
| `<StepTopic />` | 主题输入 |
| `<StepOutline />` | 大纲编辑 |
| `<StepArticle />` | 正文流式生成 |
| `<StepImages />` | 图片生成进度 |
| `<StepArrange />` | 拖拽调整 |
| `<StepExport />` | 平台选择 + 导出 |
| `<DraftEditor />` | 草稿编辑器 |
| `<DraftList />` | 草稿列表 |
| `<ImageGallery />` | 图片管理 |
| `<ProviderConfig />` | AI Provider 配置 |
| `<ModelSelector />` | 模型选择下拉 |

---

## 12. 安全设计

### 12.1 认证

| 项 | 实现 |
|---|---|
| 密码哈希 | argon2id（OWASP 推荐） |
| 会话存储 | 服务端 SQLite（HttpOnly cookie） |
| 会话过期 | 7 天可滑动、30 天硬过期 |
| CSRF | Next.js 内置 + SameSite=Lax cookie |
| 登录限流 | 5 次/分钟/IP，超出返回 429 |
| 注册限制 | 仅管理员可注册（V1 仅第一个用户） |

### 12.2 数据保护

| 项 | 实现 |
|---|---|
| API Key | OS Keychain（macOS Keychain / Windows Credential Manager / Linux Secret Service） |
| SQL 注入 | Drizzle ORM 参数化查询 |
| XSS | React 默认转义 + CSP 头 |
| 文件路径 | 严格白名单（防路径穿越） |
| 越权访问 | 所有 DB 查询带 user_id WHERE |

### 12.3 网络层

- 仅监听 localhost（127.0.0.1），不暴露 0.0.0.0
- CSP 头禁止内联脚本和外部资源
- HSTS（虽然本地不需要，但代码层面准备好）

### 12.4 操作审计

- 登录/登出/失败登录记录
- AI Provider 添加/删除/Key 修改记录
- 草稿创建/删除/导出记录
- 设置变更记录

---

## 13. 预置分类与提示词

### 13.1 8 个预置分类

| slug | 名称 | emoji | 描述 |
|---|---|---|---|
| `ai` | AI 与科技 | 🤖 | AI 技术、应用、行业动态 |
| `tech` | 程序员向 | 💻 | 技术教程、工具、编程实践 |
| `mom-baby` | 母婴育儿 | 👶 | 育儿经验、母婴用品、早教 |
| `life` | 生活百科 | 🏠 | 生活技巧、家居、购物 |
| `career` | 职场发展 | 💼 | 职业规划、面试、职场关系 |
| `emotion` | 情感心理 | 💗 | 两性关系、心理、情感故事 |
| `food` | 美食烹饪 | 🍜 | 菜谱、探店、美食文化 |
| `education` | 教育学习 | 📚 | 学习方法、考试、课外辅导 |

### 13.2 提示词模板结构

每个分类 4 个模板：
- `outline` - 大纲生成
- `article` - 正文生成
- `title` - 标题优化（可选）
- `imagePrompt` - 图片提示词生成

模板变量：
- `{{topic}}` - 用户输入主题
- `{{keywords}}` - 关键词
- `{{wordCount}}` - 目标字数
- `{{platform}}` - 目标平台
- `{{outline}}` - 已生成的大纲（仅 article 用）

---

## 14. 实施计划（高层）

### 14.1 阶段划分

**Phase 1: 基础设施**（3-5 天）
- Next.js 项目初始化 + shadcn/ui 配置
- SQLite + Drizzle 集成
- 数据 schema 迁移系统
- Auth.js 集成 + 登录/注册页
- CLI 启动器骨架

**Phase 2: AI 层**（3-4 天）
- AI Provider 抽象
- 4 个内置 Provider 实现
- 模型管理 UI
- Provider 配置 UI
- 加密存储（Keychain）

**Phase 3: 内容生成**（5-7 天）
- 生成向导框架（多步骤）
- 大纲生成
- 正文生成（流式）
- 图片生成（并发）
- 草稿编辑器
- 草稿管理

**Phase 4: 平台格式**（2-3 天）
- 平台适配器接口
- 5 个平台实现（公众号、CSDN、掘金、小红书、知乎）
- 导出 UI

**Phase 5: 预置内容**（2-3 天）
- 8 个分类的提示词模板
- 测试与调优

**Phase 6: UI 打磨**（3-5 天）
- 视觉效果优化
- 交互细节
- 错误处理
- 加载状态

**Phase 7: 打包与发布**（2-3 天）
- Bun --compile 跨平台打包
- 安装测试
- README + 文档

**总计 MVP**：约 20-30 天工作量（按 4-5h/天）

### 14.2 优先级建议

如果时间紧，按以下优先级实现：
1. 必须：基础设施 + AI 层 + 内容生成（Phase 1-3）
2. 重要：平台格式（Phase 4）
3. 可后置：UI 打磨（Phase 6）

---

## 15. 风险与未决项

### 15.1 已识别风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| AI API 限流 | 用户体验下降 | 错误提示 + 队列 + 重试 |
| 平台规则变化 | 适配器失效 | 适配器独立 + 易更新 |
| Bun --compile 兼容性 | 部分平台打包失败 | 提供源码 fallback |
| 提示词效果不佳 | 生成质量差 | 持续迭代 + 用户可自定义 |

### 15.2 未决项

- 提示词模板具体内容（实施时细化）
- 哪些平台优先支持（建议公众号 + CSDN + 小红书）
- UI 视觉风格具体选什么（实施时定）
- License 服务端点（V2 再说）

---

## 16. 参考资料

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Auth.js (NextAuth)](https://authjs.dev/)
- [Bun --compile](https://bun.sh/docs/bundler/fullstack#bun-compile)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com/)
- [argon2 npm](https://www.npmjs.com/package/argon2)
- [keytar](https://github.com/atom/node-keytar) - 跨平台 Keychain