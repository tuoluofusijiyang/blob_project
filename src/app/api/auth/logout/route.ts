import { NextResponse } from 'next/server';
import { getCurrentSessionId, clearSessionCookie } from '@/lib/auth/middleware';
import { deleteSession } from '@/lib/auth/session';

export async function POST() {
  const sessionId = await getCurrentSessionId();
  if (sessionId) await deleteSession(sessionId);
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}