import { randomBytes } from 'crypto';
import { getDb, schema } from '@/lib/db/client';
import { eq, lt } from 'drizzle-orm';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export async function createSession(userId: number, ttlMs = SESSION_DURATION_MS): Promise<string> {
  const id = randomBytes(32).toString('hex');
  const expiresAt = Math.floor((Date.now() + ttlMs) / 1000);
  const db = getDb();
  db.insert(schema.sessions).values({ id, userId, expiresAt }).run();
  return id;
}

export async function getSession(id: string) {
  const db = getDb();
  const session = db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
  if (!session) return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
    return null;
  }
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  const db = getDb();
  db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
}

export async function cleanExpiredSessions(): Promise<void> {
  const db = getDb();
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Math.floor(Date.now() / 1000))).run();
}