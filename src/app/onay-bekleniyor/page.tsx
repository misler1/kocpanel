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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="mb-2 text-[18px] font-semibold text-gray-900">Onay Bekleniyor</h1>
        <p className="mb-6 text-[13px] text-gray-500">
          Hesabınız yönetici tarafından henüz onaylanmamış. Onaylandıktan sonra sisteme erişebilirsiniz.
        </p>
        <form action={handleLogout}>
          <button
            type="submit"
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50"
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}