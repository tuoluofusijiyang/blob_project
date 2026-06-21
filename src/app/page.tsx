import { redirect } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/middleware';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  const db = getDb();
  const userCount = db.select().from(schema.users).all().length;
  redirect(userCount === 0 ? '/register' : '/login');
}