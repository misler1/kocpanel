import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope } from '@/lib/supabase/request-cache';
import { applyStudentScope } from '@/lib/effective-coach';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import type { Profile } from '@/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  // Profil ve öğrenci sayısı aynı anda (birbirini beklemeden) okunur; sayı için yalnızca adet istenir
  const [{ data: profile }, studentCount] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getRequestScope(user.id, includeInterns).then(async (scope) => {
      const { count } = await applyStudentScope(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('students').select('id', { count: 'exact', head: true }).neq('status', 'pasif'),
        scope
      );
      return count ?? 0;
    }),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Topbar profile={profile as Profile | null} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar studentCount={studentCount} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav studentCount={studentCount} />
    </div>
  );
}
