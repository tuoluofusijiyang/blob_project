#!/usr/bin/env bun
import { spawn } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PORT = 7842;

function getDataDir(): string {
  const home = homedir();
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'content-tools');
  }
  return join(home, '.content-tools');
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({ port, fetch: () => new Response() });
    await server.stop();
    return false;
  } catch {
    return true;
  }
}

async function waitForServer(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const dataDir = getDataDir();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('✨ 数据目录已创建：', dataDir);
  }

  console.log('🚀 正在启动内容生成 tools...\n');

  if (await isPortInUse(PORT)) {
    console.error(`❌ 端口 ${PORT} 已被占用`);
    console.error('   可能另一个实例正在运行');
    process.exit(1);
  }

  const server = spawn({
    cmd: ['bun', 'run', 'bin/server.ts'],
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir },
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const ready = await waitForServer(`http://localhost:${PORT}/api/health`);
  if (!ready) {
    console.error('❌ 服务启动超时');
    server.kill();
    process.exit(1);
  }

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

  try {
    const open = (await import('open')).default;
    await open(`http://localhost:${PORT}`);
  } catch {
    console.log('（无法自动打开浏览器，请手动访问上述 URL）');
  }

  const cleanup = () => {
    console.log('\n👋 正在关闭...');
    server.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('启动失败：', err);
  process.exit(1);
});