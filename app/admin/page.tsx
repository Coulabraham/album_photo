import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { AdminDashboard } from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/login');
  return <AdminDashboard email={user.email || 'Administrateur'} />;
}
