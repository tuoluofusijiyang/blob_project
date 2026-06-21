# 内容生成 tools

本地运行的 CLI 工具，启动后通过浏览器访问，帮助内容创作者一键生成多平台、多风格、带配图的文章草稿。

## 特性

- 🤖 **多 AI 模型支持** — OpenAI 兼容协议（DeepSeek、通义千问、Moonshot 等）+ Anthropic Claude
- 📝 **8 个预置分类** — AI、科技、母婴、生活、职场、情感、美食、教育
- 🎨 **AI 自动配图** — AI 生成封面图与内文插图
- 📱 **5+ 平台格式** — 微信公众号、CSDN、掘金、小红书、知乎、Markdown
- 🔒 **本地优先** — 数据存本地 SQLite，API Key 存 OS Keychain
- 🎯 **不抓取、不发布** — 专注生成，发布你自己来

## 快速开始

### 前置要求

- [Bun](https://bun.sh) >= 1.0
- Node.js（仅用于某些 native 模块）

### 开发模式

```bash
# 安装依赖
bun install

# 生成数据库迁移
bun run db:generate

# 运行迁移
bun run db:migrate

# 启动 dev server
bun run dev

# 或启动 CLI launcher
bun run cli:dev
```

### 生产模式

```bash
# 构建
bun run build

# 启动
bun run start
```

### 打包为单二进制（CLI 分发）

```bash
# macOS Apple Silicon
bun build --compile --target=bun-darwin-arm64 ./bin/cli.ts --outfile dist/content-tools-mac-arm64

# macOS Intel
bun build --compile --target=bun-darwin-x64 ./bin/cli.ts --outfile dist/content-tools-mac-x64

# Windows
bun build --compile --target=bun-windows-x64 ./bin/cli.ts --outfile dist/content-tools.exe

# Linux
bun build --compile --target=bun-linux-x64 ./bin/cli.ts --outfile dist/content-tools-linux
```

## 使用流程

1. 启动 CLI → 浏览器自动打开 http://localhost:7842
2. 首次启动 → 创建管理员账户
3. 设置 → AI Providers → 添加 OpenAI / Claude 等
4. 生成文章 → 选分类 → 选模型 → 输入主题 → 生成大纲 → 生成正文 → 生成图片 → 选择平台 → 复制到目标平台

## 架构

```
CLI (bin/cli.ts)              用户入口
  ↓
Next.js 全栈应用 (端口 7842)
  ├─ Web UI (shadcn/ui)       浏览器交互
  ├─ API Routes               业务逻辑
  ├─ AI Provider 抽象层        多模型适配
  ├─ 平台格式适配器             5+ 平台输出
  └─ SQLite + Drizzle         本地数据
  ↓
外部 AI 服务（用户自己提供 API Key）
```

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── dashboard/         # 仪表盘
│   ├── generate/          # 生成向导
│   ├── drafts/            # 草稿管理
│   ├── settings/          # 设置
│   ├── login/             # 登录
│   └── register/          # 注册
├── components/
│   ├── ui/                # shadcn/ui 组件
│   ├── layout/            # 布局
│   ├── auth/              # 认证表单
│   ├── generate/          # 生成向导
│   └── draft/             # 草稿编辑器
├── lib/
│   ├── auth/              # 认证
│   ├── db/                # 数据库
│   ├── ai/                # AI Provider
│   ├── format/            # 平台格式
│   ├── generate/          # 生成引擎
│   ├── keychain/          # Keychain 加密
│   └── utils.ts
└── prompts/
    └── categories/        # 提示词模板

bin/
├── cli.ts                 # CLI 入口
└── server.ts              # 服务封装
```

## 安全

- 密码：argon2id 哈希
- API Key：OS Keychain 加密（macOS / Windows / Linux）
- 会话：HttpOnly + SameSite cookie
- CSRF：Next.js 内置
- 限流：登录 5 次/分钟
- SQL 注入：Drizzle ORM 参数化
- 仅监听 localhost

## 数据存储

- **macOS / Linux**: `~/.content-tools/`
- **Windows**: `%APPDATA%/content-tools/`

## License

MIT