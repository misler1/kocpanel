'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SifremiUnuttumPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-soft)]">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--ink)]">E-posta gönderildi</h2>
          <p className="mb-6 text-sm text-[var(--ink-muted)]">Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.</p>
          <Link href="/giris" className="text-sm font-medium text-[var(--accent-dark)] hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-[var(--ink)]">Şifremi unuttum</h2>
        <p className="mb-6 text-sm text-[var(--ink-muted)]">E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              placeholder="ornek@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {loading ? 'Gönderiliyor...' : 'Bağlantı gönder'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/giris" className="font-medium text-[var(--accent-dark)] hover:underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
}