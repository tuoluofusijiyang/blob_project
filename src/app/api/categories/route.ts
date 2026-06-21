import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, or, and } from 'drizzle-orm';
import { seedBuiltinData } from '@/lib/db/seed';

let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  await seedBuiltinData();
  seeded = true;
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    await ensureSeed();
    const db = getDb();
    const categories = db.select().from(schema.categories)
      .where(or(
        eq(schema.categories.isBuiltin, 1),
        eq(schema.categories.userId, user.id)
      ))
      .all();
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}