import { AppShell } from '@/components/layout/app-shell';
import { ProvidersClient } from './providers-client';

export default function ProvidersPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Providers</h2>
          <p className="text-muted-foreground">配置 AI 模型服务的 API Key</p>
        </div>
        <ProvidersClient />
      </div>
    </AppShell>
  );
}