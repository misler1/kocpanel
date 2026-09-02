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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">E-posta gönderildi</h2>
          <p className="mb-6 text-sm text-gray-500">Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.</p>
          <Link href="/giris" className="text-sm text-blue-600 hover:underline">Giriş sayfasına dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">Şifremi unuttum</h2>
        <p className="mb-6 text-sm text-gray-500">E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="ornek@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Gönderiliyor...' : 'Bağlantı gönder'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/giris" className="text-blue-600 hover:underline">Giriş sayfasına dön</Link>
        </p>
      </div>
    </div>
  );
}