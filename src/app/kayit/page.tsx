'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'koc', label: 'Koç' },
  { value: 'ogretmen', label: 'Öğretmen' },
  { value: 'veli', label: 'Veli' },
  { value: 'ogrenci', label: 'Öğrenci' },
];

export default function KayitPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('koc');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Kayıt sırasında bir hata oluştu.');
      setLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase.from('profiles') as any).insert({
      id: data.user.id,
      full_name: fullName,
      role,
    });

    if (profileError) {
      setError('Profil oluşturulamadı: ' + profileError.message);
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

        <h2 className="mb-1 text-xl font-semibold text-gray-900">Hesap oluştur</h2>
        <p className="mb-6 text-sm text-gray-500">Bilgilerinizi girerek hesabınızı oluşturun.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ayşe Yılmaz"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="En az 6 karakter"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Oluşturuluyor...' : 'Hesap oluştur'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="font-medium text-blue-600 hover:underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
