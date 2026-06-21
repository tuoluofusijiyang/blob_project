import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { setSessionCookie } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 5) return false;
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'localhost';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '尝试次数过多，请稍后再试' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = LoginSchema.parse(body);

    const db = getDb();
    const user = db.select().from(schema.users).where(eq(schema.users.username, data.username)).get();

    if (!user || !user.isActive) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    db.update(schema.users)
      .set({ lastLoginAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.users.id, user.id))
      .run();

    return NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}