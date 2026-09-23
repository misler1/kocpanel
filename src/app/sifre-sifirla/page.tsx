'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function SifreSifirlaForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    async function verify() {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || type !== 'recovery') {
        setError('Geçersiz veya eksik şifre sıfırlama linki.');
        setVerifying(false);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (error) {
        setError('Bu link süresi dolmuş veya daha önce kullanılmış. Lütfen yeni bir şifre sıfırlama e-postası isteyin.');
        setVerifying(false);
        return;
      }

      setReady(true);
      setVerifying(false);
    }
    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError('Şifre güncellenemedi. Lütfen tekrar deneyin.');
      setLoading(false);
      return;
    }
      // Diğer tüm oturumları (bu cihaz hariç) kapat
    await supabase.auth.signOut({ scope: 'others' });
    router.push('/anasayfa');
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)]">
        <p className="text-sm text-white/50">Doğrulanıyor...</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
          <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          <a href="/sifremi-unuttum" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
            Yeni link iste →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-[var(--ink)]">Yeni şifre belirle</h2>
        <p className="mb-6 text-sm text-[var(--ink-muted)]">Yeni şifrenizi girin.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Yeni şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              placeholder="En az 6 karakter"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Şifre tekrar</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              placeholder="Şifreyi tekrar girin"
            />
          </div>
          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SifreSifirlaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)]">
          <p className="text-sm text-white/50">Yükleniyor...</p>
        </div>
      }
    >
      <SifreSifirlaForm />
    </Suspense>
  );
}