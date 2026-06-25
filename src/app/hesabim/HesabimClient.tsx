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
        <h1 className="text-[18px] font-medium text-gray-900">Hesabım</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Profil bilgilerinizi güncelleyin</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
            {initials}
          </div>
          <div>
            <div className="font-medium text-gray-900">{profile?.full_name}</div>
            <div className="text-sm text-gray-500">{ROLE_LABELS[profile?.role] ?? profile?.role}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <IconUser size={14} /> Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <IconPhone size={14} /> Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0532 000 00 00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {saved && <span className="text-sm text-emerald-600">✓ Kaydedildi</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
