'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SifreDegistirClient({ forced }: { forced: boolean }) {
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
    if (/^\d{8}$/.test(pw)) return setError('Şifre sadece rakamlardan oluşmasın; harf de ekle.');

    setLoading(true);
    const { error: upErr } = await supabase.auth.updateUser({ password: pw });
    if (upErr) { setError(upErr.message); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) await (supabase.from('profiles') as any).update({ must_change_password: false }).eq('id', user.id);

    router.push('/ogrenci');
    router.refresh();
  }

  const input = 'w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-4 py-3 text-[15px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)]';
  return (
    <div className="mx-auto max-w-sm rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-6 text-center">
      <div className="student-float mb-2 text-[52px]">🔐</div>
      <h1 className="mb-1 text-[22px] font-extrabold text-[var(--ink)]">Yeni şifre belirle</h1>
      <p className="mb-5 text-[14px] font-medium text-[var(--ink-muted)]">
        {forced ? 'Güvenliğin için ilk girişte şifreni değiştirmen gerekiyor.' : 'Yeni şifreni yaz.'}
      </p>
      <form onSubmit={submit} className="space-y-3 text-left">
        <input type="password" required autoComplete="new-password" placeholder="Yeni şifre (en az 8 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
        <input type="password" required autoComplete="new-password" placeholder="Yeni şifre (tekrar)" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
        {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-2.5 text-[13px] font-bold text-[var(--danger)]">😕 {error}</p>}
        <button disabled={loading} className="w-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(139,92,246,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
          {loading ? 'Kaydediliyor...' : 'Şifreyi kaydet ✨'}
        </button>
      </form>
    </div>
  );
}
