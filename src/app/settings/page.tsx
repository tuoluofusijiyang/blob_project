import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">设置</h2>
          <p className="text-muted-foreground">管理 AI Provider、模型、账户与偏好</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/settings/providers">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>AI Providers</CardTitle>
                <CardDescription>配置 OpenAI、Claude 等模型的 API Key</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle>账户设置</CardTitle>
              <CardDescription>修改密码、显示名（即将推出）</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle>偏好设置</CardTitle>
              <CardDescription>主题、语言、默认值（即将推出）</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle>License</CardTitle>
              <CardDescription>激活许可证（即将推出）</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}