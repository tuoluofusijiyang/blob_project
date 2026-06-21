import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export function ProviderSetupPrompt() {
  return (
    <Card className="border-amber-500 bg-amber-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <CardTitle>需要先配置 AI Provider</CardTitle>
        </div>
        <CardDescription>
          请先在设置中添加至少一个 AI Provider（OpenAI、Claude 等）才能开始生成。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/settings/providers">前往配置</Link>
        </Button>
      </CardContent>
    </Card>
  );
}