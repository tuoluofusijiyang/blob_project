import { AppShell } from '@/components/layout/app-shell';
import { GeneratorWizard } from '@/components/generate/generator-wizard';

export default function GeneratePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">生成文章</h2>
          <p className="text-muted-foreground">通过引导步骤快速生成多平台草稿</p>
        </div>
        <GeneratorWizard />
      </div>
    </AppShell>
  );
}