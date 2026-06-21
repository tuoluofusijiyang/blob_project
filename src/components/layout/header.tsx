'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/auth/types';

export function Header({ user }: { user: User }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">内容生成 tools</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user.displayName || user.username}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>登出</Button>
      </div>
    </header>
  );
}