'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconUser, IconPhone, IconUserCircle, IconMail } from '@tabler/icons-react';
import { isPlaceholderEmail } from '@/lib/student-account';
import { PageHero } from '@/components/ui/PageHero';
import { PushToggle } from '@/components/PushToggle';

const ROLE_LABELS: Record<string, string> = {
  koc: 'Koç',
  ogrenci: 'Öğrenci',
  veli: 'Veli',
  ogretmen: 'Öğretmen',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function HesabimClient({ profile, userId }: { profile: any; userId: string }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'KP';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', userId);
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHero
        theme="slate"
        icon={<IconUserCircle size={22} />}
        title="Hesabım"
        subtitle="Profil bilgilerinizi güncelleyin"
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl font-semibold text-[var(--accent-dark)]">
            {initials}
          </div>
          <div>
            <div className="font-medium text-[var(--ink)]">{profile?.full_name}</div>
            <div className="text-sm text-[var(--ink-muted)]">{ROLE_LABELS[profile?.role] ?? profile?.role}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
              <IconUser size={14} /> Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
              <IconPhone size={14} /> Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0532 000 00 00"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {saved && <span className="text-sm font-medium text-[var(--success)]">✓ Kaydedildi</span>}
          </div>
        </form>
      </div>

      {profile?.role !== 'ogrenci' && profile?.role !== 'veli' && <EmailCard initial={profile?.email ?? ''} />}

      <div className="mt-4">
        <PushToggle />
      </div>
    </div>
  );
}
/** E-posta adresi: ilk girişte "Daha sonra eklerim" diyen personel buradan ekler / değiştirir */
function EmailCard({ initial }: { initial: string }) {
  const real = initial && !isPlaceholderEmail(initial) ? initial : '';
  const [email, setEmail] = useState(real);
  const [current, setCurrent] = useState(real);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch('/api/personel/kurulum', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'email', email }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setMsg({ ok: false, text: json.error ?? 'Kaydedilemedi, tekrar deneyin.' }); return; }
    setCurrent(email.trim().toLowerCase());
    setMsg({ ok: true, text: json.sent ? 'E-posta adresiniz kaydedildi, hoş geldiniz e-postası gönderildi.' : 'E-posta adresiniz kaydedildi.' });
  }

  return (
    <form onSubmit={save} className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-5">
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
        <IconMail size={14} /> E-posta adresi
      </label>
      <p className="mb-2 text-[12px] text-[var(--ink-muted)]">
        {current ? 'Hesap bilgilendirmeleri bu adrese gönderilir.' : 'Henüz e-posta eklemediniz. Hesap bilgilendirmelerini almak için ekleyin.'}
      </p>
      <div className="flex gap-2">
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
        <button type="submit" disabled={busy || !email.trim() || email.trim().toLowerCase() === current}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
          {busy ? 'Kaydediliyor…' : current ? 'Güncelle' : 'Ekle'}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{msg.text}</p>}
    </form>
  );
}
