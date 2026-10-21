'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { studentEmailFromPhone } from '@/lib/student-account';

export default function OgrenciKayitPage() {
  const router = useRouter();
  const supabase = createClient();
  const [coaches, setCoaches] = useState<{ id: string; full_name: string }[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [coachId, setCoachId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ogrenci/kocler').then((r) => r.json()).then((j) => setCoaches(j.coaches ?? [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/ogrenci/kayit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, birthDate, password, coachId: coachId || null }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Kayıt sırasında bir hata oluştu.');
      setLoading(false);
      return;
    }

    // Kayıt tamam: giriş yap, onay bekleme ekranına yönlendirilir.
    const email = studentEmailFromPhone(phone)!;
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) { router.push('/giris/ogrenci'); return; }
    router.push('/ogrenci');
    router.refresh();
  }

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={260} height={75} className="h-14 w-auto max-w-full object-contain" priority />
        </div>
        <h2 className="mb-1 text-xl font-semibold text-gray-900">Öğrenci kaydı</h2>
        <p className="mb-6 text-sm text-gray-500">Kaydın yönetici onayından sonra aktif olur.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ad Soyad</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefon (giriş için kullanıcı adın)</label>
            <input type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="05XX XXX XX XX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Doğum tarihi</label>
            <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Şifre</label>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="En az 8 karakter" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Koç öğretmen (isteğe bağlı)</label>
            <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={input}>
              <option value="">Seçmek istemiyorum</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">Seçersen önce yönetici, sonra seçtiğin koç onaylar. Seçmezsen yönetici koç atar.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Kaydediliyor...' : 'Kayıt ol'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">
          Zaten hesabın var mı?{' '}
          <Link href="/giris/ogrenci" className="font-medium text-blue-600 hover:underline">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
