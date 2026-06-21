#!/usr/bin/env bun
// Next.js 生产服务器封装（开发模式启动 dev server）
import { spawn } from 'bun';

const port = Number(process.env.PORT) || 7842;
const isDev = process.env.NODE_ENV !== 'production';

async function main() {
  const cmd = isDev
    ? ['bun', 'run', 'next', 'dev', '--turbopack', '-p', String(port), '-H', '127.0.0.1']
    : ['node', '.next/standalone/bin/server.js'];

  const proc = spawn({
    cmd,
    env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1' },
    stdout: 'inherit',
    stderr: 'inherit',
  });

  process.on('SIGINT', () => proc.kill());
  process.on('SIGTERM', () => proc.kill());
}

main();