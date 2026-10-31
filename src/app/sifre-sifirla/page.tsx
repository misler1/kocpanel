'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Şifre sıfırlama linki tıklanınca Supabase hemen oturum açar. Bu bayrak varken middleware
// kullanıcıyı yeni şifre belirleyene (ya da vazgeçip çıkış yapana) kadar bu sayfada tutar.
// Ad, src/middleware.ts içindeki RECOVERY_COOKIE ile aynı olmalı.
const RECOVERY_COOKIE = 'pw_recovery';
const LINK_ERROR = 'Bu link süresi dolmuş veya daha önce kullanılmış. Lütfen yeni bir şifre sıfırlama e-postası isteyin.';

function setRecoveryCookie(on: boolean) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = on
    ? `${RECOVERY_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${secure}`
    : `${RECOVERY_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
}

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
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (code || (tokenHash && type === 'recovery')) {
        const { error } = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' });
        if (error) {
          setError(LINK_ERROR);
          setVerifying(false);
          return;
        }
        setRecoveryCookie(true);
        // Tek kullanımlık kodu adres çubuğundan sil (sayfa yenilenince tekrar denenmesin)
        router.replace('/sifre-sifirla');
        setReady(true);
        setVerifying(false);
        return;
      }

      // Link doğrulandıktan sonra sayfa yenilendiyse: sıfırlama oturumu hâlâ açık
      const hasFlag = document.cookie.split('; ').some((c) => c === `${RECOVERY_COOKIE}=1`);
      const { data: { user } } = await supabase.auth.getUser();
      if (hasFlag && user) {
        setReady(true);
        setVerifying(false);
        return;
      }

      setError('Geçersiz veya eksik şifre sıfırlama linki.');
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
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
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
    setRecoveryCookie(false);
    router.push('/anasayfa');
    router.refresh();
  }

  // Şifreyi değiştirmeden çıkmak isteyen kullanıcı: sıfırlama oturumunu kapat
  async function handleCancel() {
    setLoading(true);
    await supabase.auth.signOut();
    setRecoveryCookie(false);
    router.push('/giris');
    router.refresh();
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
              placeholder="En az 8 karakter"
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
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="mt-3 w-full text-center text-sm text-[var(--ink-muted)] hover:underline disabled:opacity-60"
        >
          Vazgeç ve çıkış yap
        </button>
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