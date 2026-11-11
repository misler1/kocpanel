'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { studentEmailFromPhone } from '@/lib/student-account';
import { HONEYPOT_FIELD } from '@/lib/spam-guard';

export default function OgrenciKayitPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [coachMode, setCoachMode] = useState<'' | 'iletisim' | 'platform'>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formStartedAt] = useState(() => Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!coachMode) { setError('Koç öğretmen tercihini seç.'); return; }
    setLoading(true);

    const res = await fetch('/api/ogrenci/kayit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, birthDate, password, coachMode, [HONEYPOT_FIELD]: honeypot, formStartedAt }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Kayıt sırasında bir hata oluştu.');
      setLoading(false);
      return;
    }

    const email = studentEmailFromPhone(phone)!;
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) { router.push('/giris/ogrenci'); return; }
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
        <h2 className="mb-1 text-xl font-semibold text-[var(--ink)]">Öğrenci kaydı</h2>
        <p className="mb-6 text-sm text-[var(--ink-muted)]">Programını yap, çalışmalarını ve denemelerini takip et.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bot tuzağı: ekranda ve klavye gezintisinde görünmez, yalnızca botlar doldurur */}
          <input type="text" name={HONEYPOT_FIELD} value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Ad Soyad</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Telefon (giriş için kullanıcı adın)</label>
            <input type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="05XX XXX XX XX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Doğum tarihi</label>
            <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Şifre</label>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="En az 8 karakter" />
          </div>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Koç öğretmen</legend>
            <div className="space-y-2">
              {([
                ['iletisim', '📞 Koç öğretmen benimle iletişime geçsin', 'Seni arayıp tanışalım; sana uygun koç öğretmeni birlikte belirleyelim. Kaydın, koçun atanınca aktif olur.'],
                ['platform', '🚀 Koç istemiyorum, sadece platformu kullanacağım', 'Hemen başla: kendi programını yap, çalışmalarını ve deneme sonuçlarını kendin takip et.'],
              ] as const).map(([v, title, desc]) => (
                <label key={v} className={`flex cursor-pointer gap-2.5 rounded-xl border-2 p-3 transition-colors ${coachMode === v ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:bg-[var(--paper)]'}`}>
                  <input type="radio" name="coachMode" value={v} checked={coachMode === v} onChange={() => setCoachMode(v)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--accent)]" />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ink)]">{title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60">
            {loading ? 'Kaydediliyor...' : 'Kayıt ol'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          Zaten hesabın var mı?{' '}
          <Link href="/giris/ogrenci" className="font-medium text-[var(--accent-dark)] hover:underline">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
