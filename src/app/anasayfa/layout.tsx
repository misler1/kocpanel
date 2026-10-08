import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import type { Profile } from '@/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: studentsForCount } = await applyStudentScope(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('students')
      .select('id')
      .neq('status', 'pasif'),
    scope
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Topbar profile={profile as Profile | null} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar studentCount={studentsForCount?.length ?? 0} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
