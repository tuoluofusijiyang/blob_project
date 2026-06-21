import { AppShell } from '@/components/layout/app-shell';
import { requireAuth } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db/client';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DraftList } from '@/components/draft/draft-list';

export default async function DraftsPage() {
  const user = await requireAuth();
  const db = getDb();
  const drafts = db.select().from(schema.drafts)
    .where(eq(schema.drafts.userId, user.id))
    .orderBy(desc(schema.drafts.updatedAt))
    .all();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">草稿</h2>
            <p className="text-muted-foreground">管理你的所有草稿</p>
          </div>
          <Button asChild>
            <Link href="/generate">新建草稿</Link>
          </Button>
        </div>

        <DraftList drafts={drafts} />
      </div>
    </AppShell>
  );
}