import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function OnayBekleniyorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  async function handleLogout() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/giris');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="mb-2 text-[18px] font-semibold text-[var(--ink)]">Onay Bekleniyor</h1>
        <p className="mb-6 text-[13px] text-[var(--ink-muted)]">
          Hesabınız yönetici tarafından henüz onaylanmamış. Onaylandıktan sonra sisteme erişebilirsiniz.
        </p>
        <form action={handleLogout}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}