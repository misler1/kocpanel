'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChecklist, IconBooks, IconChartBar, IconSearch, IconChevronDown } from '@tabler/icons-react';
import { avatarColor, initials } from '@/lib/ui-colors';

// Belletmen ana sayfası: sade. Üstte 3 hızlı giriş kartı, altında öğrenci kartları.
// Öğrenci kartına dokununca kart açılır: günlük takip gir / deneme sonuçları / konu ilerleyişi.

export type BelletmenStudent = { id: string; full_name: string; sinif_sube: string | null; today_total: number; today_done: number };

const QUICK = [
  { href: '/gunluk-giris', title: 'Günlük takip', desc: 'Bugünkü görevleri işaretle', icon: IconChecklist, tone: 'from-emerald-500 to-teal-500' },
  { href: '/konu-ilerleyisi', title: 'Konu ilerleyişi', desc: 'Tamamlanan konuları gir', icon: IconBooks, tone: 'from-sky-500 to-indigo-500' },
  { href: '/denemeler', title: 'Deneme sonuçları', desc: 'Herkesin sonuçları', icon: IconChartBar, tone: 'from-fuchsia-500 to-violet-500' },
];

export function BelletmenAnasayfa({ name, students }: { name: string; students: BelletmenStudent[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const list = students.filter((s) => !q || s.full_name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  const doneAll = students.filter((s) => s.today_total > 0 && s.today_done >= s.today_total).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Merhaba{name ? `, ${name.split(' ')[0]}` : ''} 👋</h1>
        <p className="text-[13.5px] text-gray-500">
          {students.length} öğrenci · bugün görevlerini tamamlayan: <b className="text-gray-700">{doneAll}</b>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}
              className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${c.tone} p-4 text-white shadow-sm transition-transform hover:-translate-y-0.5`}>
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon size={24} /></span>
              <span>
                <span className="block text-[16px] font-bold">{c.title}</span>
                <span className="block text-[12.5px] opacity-90">{c.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[16px] font-bold text-gray-900">Öğrenciler</h2>
          <div className="relative ml-auto w-full max-w-xs">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-[14px] focus:border-violet-400 focus:outline-none" />
          </div>
        </div>

        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-[14px] text-gray-400">
            {students.length ? 'Bu aramada öğrenci yok.' : 'Size atanmış öğrenci yok.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => {
              const isOpen = open === s.id;
              const allDone = s.today_total > 0 && s.today_done >= s.today_total;
              return (
                <div key={s.id} className={`rounded-2xl border bg-white shadow-sm transition-shadow ${isOpen ? 'border-violet-300 shadow-md' : 'border-gray-200'}`}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 p-3.5 text-left">
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ${avatarColor(s.id)}`}>{initials(s.full_name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-gray-900">{s.full_name}</span>
                      <span className="block text-[12.5px] text-gray-500">
                        {s.sinif_sube ?? 'Sınıf yok'}
                        {s.today_total > 0
                          ? <> · bugün <b className={allDone ? 'text-emerald-600' : 'text-gray-700'}>{s.today_done}/{s.today_total}</b> görev</>
                          : ' · bugün görev yok'}
                      </span>
                    </span>
                    <IconChevronDown size={18} className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-2 border-t border-gray-100 p-3">
                      <Link href={`/gunluk-giris?ogrenci=${s.id}`} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[14px] font-semibold text-emerald-800 hover:bg-emerald-100">
                        <IconChecklist size={18} /> Günlük takip gir
                      </Link>
                      <Link href={`/denemeler?ogrenci=${s.id}`} className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-[14px] font-semibold text-violet-800 hover:bg-violet-100">
                        <IconChartBar size={18} /> Deneme sonuçlarına bak
                      </Link>
                      <Link href={`/konu-ilerleyisi?ogrenci=${s.id}`} className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-[14px] font-semibold text-sky-800 hover:bg-sky-100">
                        <IconBooks size={18} /> Konu ilerleyişi gir
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
