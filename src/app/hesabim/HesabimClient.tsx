'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconUser, IconPhone } from '@tabler/icons-react';

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
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">Hesabım</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">Profil bilgilerinizi güncelleyin</p>
      </div>

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
    </div>
  );
}