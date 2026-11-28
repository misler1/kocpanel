import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope, getRequestBilling } from '@/lib/supabase/request-cache';
import { applyStudentScope } from '@/lib/effective-coach';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BillingBanner } from '@/components/layout/BillingBanner';
import type { Profile } from '@/types/database';

// Koç paneli iskeleti (üst çubuk, menü). Abonelik süresi tamamen dolan koçta (kilitli) sayfa yerine kilit ekranı
// gösterilir; yalnızca Abonelik ve Hesabım sayfaları (allowLocked) açılır.
export async function DashboardShell({ children, allowLocked = false }: { children: React.ReactNode; allowLocked?: boolean }) {
  const supabase = await createClient();

  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  // Profil, öğrenci sayısı ve abonelik aynı anda (birbirini beklemeden) okunur; sayı için yalnızca adet istenir
  const [{ data: profile }, studentCount, billing] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getRequestScope(user.id, includeInterns).then(async (scope) => {
      const { count } = await applyStudentScope(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('students').select('id', { count: 'exact', head: true }).neq('status', 'pasif'),
        scope
      );
      return count ?? 0;
    }),
    getRequestBilling(),
  ]);

  const locked = billing?.state === 'locked' && !allowLocked;

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden bg-gray-50">
      <Topbar profile={profile as Profile | null} />
      {billing && <BillingBanner billing={billing} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar studentCount={studentCount} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {locked ? (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <p className="text-[32px]">🔒</p>
              <h1 className="mt-2 text-[18px] font-semibold text-gray-900">Hesabınız kapandı</h1>
              <p className="mt-2 text-[13.5px] text-gray-600">
                Abonelik ve görüntüleme süreniz doldu. Verileriniz silinmedi; ödeme onaylanınca hesabınız olduğu gibi yeniden açılır.
                Öğrencileriniz uygulamayı kullanmaya devam ediyor.
              </p>
              <Link href="/abonelik" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[var(--accent-dark)]">
                Abonelik ve ödeme
              </Link>
            </div>
          ) : children}
        </main>
      </div>
      <MobileBottomNav studentCount={studentCount} />
    </div>
  );
}
