import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { nunito } from '@/lib/fonts';
import { StudentSidebar } from './StudentSidebar';
import { StudentTopbar } from './StudentTopbar';
import { StudentMobileNav } from './StudentMobileNav';

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris/ogrenci');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).single();

  return (
    <div className={`student-theme ${nunito.variable} flex h-screen flex-col overflow-hidden`}>
      <StudentTopbar fullName={profile?.full_name ?? 'Öğrenci'} />
      <div className="flex flex-1 overflow-hidden">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>
      <StudentMobileNav />
    </div>
  );
}
