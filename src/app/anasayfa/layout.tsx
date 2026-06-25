import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  // Öğrenci sayısını sidebar badge için çek
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user.id);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Topbar profile={profile as Profile | null} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar studentCount={studentCount ?? 0} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
