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

  const input = 'w-full rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <div className="mb-6">
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={260} height={75} className="h-14 w-auto max-w-full object-contain" priority />
        </div>

        <h2 className="mb-1 text-xl font-semibold text-[var(--ink)]">Öğrenci girişi</h2>
        <p className="mb-6 text-sm text-[var(--ink-muted)]">Telefon numaran ve şifrenle giriş yap.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Telefon numarası</label>
            <input
              type="tel" inputMode="tel" required autoComplete="username"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              className={input}
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Şifre</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--ink-muted)]">
          Hesabın yok mu?{' '}
          <Link href="/kayit/ogrenci" className="font-medium text-[var(--accent-dark)] hover:underline">Kayıt ol</Link>
        </p>
        <p className="mt-2 text-center text-sm text-[var(--ink-muted)]">
          Koç / öğretmen misin?{' '}
          <Link href="/giris" className="font-medium text-[var(--accent-dark)] hover:underline">Buradan giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
