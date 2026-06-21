import { AppShell } from '@/components/layout/app-shell';
import { getDb, schema } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, sql, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getDb();

  const draftCount = db.select({ count: sql<number>`count(*)` })
    .from(schema.drafts)
    .where(eq(schema.drafts.userId, user.id))
    .get()?.count || 0;

  const monthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const monthDrafts = db.select({ count: sql<number>`count(*)` })
    .from(schema.drafts)
    .where(sql`${schema.drafts.userId} = ${user.id} AND ${schema.drafts.createdAt} >= ${monthAgo}`)
    .get()?.count || 0;

  const providerCount = db.select({ count: sql<number>`count(*)` })
    .from(schema.aiProviders)
    .where(eq(schema.aiProviders.userId, user.id))
    .get()?.count || 0;

  const recentDrafts = db.select()
    .from(schema.drafts)
    .where(eq(schema.drafts.userId, user.id))
    .orderBy(desc(schema.drafts.updatedAt))
    .limit(5)
    .all();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-muted-foreground">欢迎使用内容生成 tools</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>草稿总数</CardDescription>
              <CardTitle className="text-3xl">{draftCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>本月生成</CardDescription>
              <CardTitle className="text-3xl">{monthDrafts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已配置模型</CardDescription>
              <CardTitle className="text-3xl">{providerCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>快速开始</CardTitle>
              <CardDescription>
                {providerCount === 0
                  ? '请先在「设置 → AI Providers」配置你的第一个模型'
                  : '选择一个分类开始生成'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/generate">开始生成</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近草稿</CardTitle>
              <CardDescription>你最近编辑的 5 篇草稿</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有草稿</p>
              ) : (
                <ul className="space-y-2">
                  {recentDrafts.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/drafts/${d.id}`}
                        className="text-sm hover:underline"
                      >
                        {d.title || '(无标题)'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}