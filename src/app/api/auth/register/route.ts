import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { setSessionCookie } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

const RegisterSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RegisterSchema.parse(body);

    const db = getDb();

    const userCount = db.select().from(schema.users).all().length;
    if (userCount > 0) {
      return NextResponse.json({ error: '注册已关闭，请联系管理员' }, { status: 403 });
    }

    const existing = db.select().from(schema.users).where(eq(schema.users.username, data.username)).get();
    if (existing) {
      return NextResponse.json({ error: '用户名已被使用' }, { status: 400 });
    }

    const passwordHash = await hashPassword(data.password);
    const user = db.insert(schema.users).values({
      username: data.username,
      passwordHash,
      displayName: data.displayName || data.username,
      role: 'admin',
    }).returning().get();

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '参数错误', details: err.errors }, { status: 400 });
    }
    console.error('Register error:', err);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}