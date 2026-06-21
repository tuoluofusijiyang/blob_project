import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Sidebar } from './sidebar';
import { Header } from './header';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const userForClient = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header user={userForClient} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}