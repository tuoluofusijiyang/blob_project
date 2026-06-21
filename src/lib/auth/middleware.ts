import { cookies } from 'next/headers';
import { getSession } from './session';
import { getDb, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'ct_session';

export async function getCurrentSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const sessionId = await getCurrentSessionId();
  if (!sessionId) return false;
  const session = await getSession(sessionId);
  return session !== null;
}

export async function getCurrentUser() {
  const sessionId = await getCurrentSessionId();
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const db = getDb();
  const user = db.select().from(schema.users).where(eq(schema.users.id, session.userId)).get();
  return user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}