'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { studentEmailFromPhone } from '@/lib/student-account';

export default function OgrenciGirisPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const email = studentEmailFromPhone(phone);
    if (!email) {
      setError('Lütfen telefon numaranızı 05XX XXX XX XX biçiminde yazın.');
      return;
    }

    setLoading(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setError('Telefon numarası veya şifre hatalı.');
      setLoading(false);
      return;
    }

    router.push('/ogrenci');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={260} height={75} className="h-14 w-auto max-w-full object-contain" priority />
        </div>

        <h2 className="mb-1 text-xl font-semibold text-gray-900">Öğrenci girişi</h2>
        <p className="mb-6 text-sm text-gray-500">Telefon numaran ve şifrenle giriş yap.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefon numarası</label>
            <input
              type="tel" inputMode="tel" required autoComplete="username"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Şifre</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          İlk şifren: telefonunun son 4 hanesi + doğum yılın (örn. 96832009). İlk girişte değiştirmen istenecek.
        </p>
        <p className="mt-4 text-center text-sm text-gray-500">
          Hesabın yok mu?{' '}
          <Link href="/kayit/ogrenci" className="font-medium text-blue-600 hover:underline">Kayıt ol</Link>
        </p>
        <p className="mt-4 text-center text-sm text-gray-500">
          Koç / öğretmen misin?{' '}
          <Link href="/giris" className="font-medium text-blue-600 hover:underline">Buradan giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
