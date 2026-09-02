'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function GirisPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-posta veya şifre hatalı.');
      setLoading(false);
      return;
    }

    router.push('/anasayfa');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-semibold">K</div>
          <h1 className="text-lg font-medium text-gray-900">KoçPanel</h1>
        </div>

        <h2 className="mb-1 text-xl font-semibold text-gray-900">Giriş yap</h2>
        <p className="mb-6 text-sm text-gray-500">Hesabınıza giriş yaparak panele ulaşın.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="ornek@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>
         <p className="mt-3 text-center text-sm">
          <Link href="/sifremi-unuttum" className="text-gray-500 hover:underline">
            Şifremi unuttum
          </Link>
        </p>
        <p className="mt-5 text-center text-sm text-gray-500">
          Hesabınız yok mu?{' '}
          <Link href="/kayit" className="font-medium text-blue-600 hover:underline">
            Kayıt olun
          </Link>
        </p>
      </div>
    </div>
  );
}
