import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { seedPlatformFormats } from '@/lib/db/seed';

export async function GET(_req: NextRequest) {
  try {
    await requireAuth();
    await seedPlatformFormats();
    const db = getDb();
    const platforms = db.select().from(schema.platformFormats).all();
    return NextResponse.json({ platforms });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}