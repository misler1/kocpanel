'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VeliSifreDegistirPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    if (pw !== pw2) return setError('Şifreler aynı değil.');
    if (/^\d+$/.test(pw)) return setError('Şifre sadece rakamlardan oluşmasın; harf de ekleyin.');

    setLoading(true);
    const { error: upErr } = await supabase.auth.updateUser({ password: pw });
    if (upErr) { setError(upErr.message); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user) await (supabase.from('profiles') as any).update({ must_change_password: false }).eq('id', user.id);
    router.push('/veli');
    router.refresh();
  }

  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:border-blue-500';
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-[18px] font-semibold text-gray-900">Şifrenizi belirleyin</h1>
        <p className="text-[13px] text-gray-500">Güvenliğiniz için ilk girişte kendi şifrenizi belirlemeniz gerekiyor.</p>
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Yeni şifre (en az 8 karakter)" className={input} />
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Yeni şifre (tekrar)" className={input} />
        {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-[14px] font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
        </button>
      </form>
    </div>
  );
}
