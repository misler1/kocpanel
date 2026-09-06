'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconSchool } from '@tabler/icons-react';
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]">
            <IconSchool size={18} className="text-white" />
          </span>
          <h1 className="text-[17px] font-semibold tracking-tight text-[var(--ink)]">KoçPanel</h1>
        </div>

        <h2 className="mb-1 text-xl font-semibold text-[var(--ink)]">Hesap oluştur</h2>
        <p className="mb-6 text-sm text-[var(--ink-muted)]">Bilgilerinizi girerek hesabınızı oluşturun.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Ad Soyad</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              placeholder="Ayşe Yılmaz"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              placeholder="En az 6 karakter"
            />
          </div>

          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {loading ? 'Oluşturuluyor...' : 'Hesap oluştur'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="font-medium text-[var(--accent-dark)] hover:underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}