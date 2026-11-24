'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { IconCalendarEvent } from '@tabler/icons-react';
import { DAY_SHORT, programDays, shortDate } from '@/lib/program-days';
import { ProgramReview } from './program/ProgramReview';

// Öğrencinin kendi yaptığı ya da belletmenin hazırladığı, koçun onayını bekleyen programlar.
// "Programı aç" Haftalık Takip panosunun görünümünde açılır; koç orada düzenleyip onaylar ya da reddeder.
// Onay: program geçerli olur, koçun o tarihlerdeki programı (varsa) silinir. Ret: hiçbir şey değişmez.
export function OgrenciProgramOnaylari({ programs }: { programs: any[] }) {
  const [open, setOpen] = useState<any | null>(null);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-violet-100 px-4 py-2.5">
        <IconCalendarEvent size={17} className="text-violet-600" />
        <p className="text-[13.5px] font-semibold text-violet-900">{programs.length} program onayınızı bekliyor</p>
        <p className="w-full text-[11.5px] text-violet-700 sm:ml-auto sm:w-auto">Açıp haftalık takipteki gibi inceleyin, gerekirse düzenleyip onaylayın.</p>
      </div>
      <div className="divide-y divide-violet-100">
        {programs.map((p) => {
          const tasks: any[] = Array.isArray(p.tasks) ? p.tasks : [];
          const days = programDays(p.week_start, p.week_end);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
                  {p.students?.id
                    ? <Link href={`/ogrenciler/${p.students.id}`} className="font-semibold text-gray-900 hover:underline">{p.students.full_name}</Link>
                    : <span className="font-semibold text-gray-900">{p.students?.full_name}</span>}
                  <span className="text-gray-500">{shortDate(p.week_start)} – {shortDate(p.week_end)} · {tasks.length} görev</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.prepared_by ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                    {p.prepared_by ? `🧑‍🏫 ${p.prepared_by_name ?? 'Personel'} hazırladı` : '🧑‍🎓 Öğrencinin kendi programı'}
                  </span>
                </div>
                {/* Gün gün görev sayısı */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {days.map((d) => {
                    const n = tasks.filter((t) => Number(t.plan_day) === d.weekday).length;
                    return (
                      <span key={d.weekday} className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${n ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                        {DAY_SHORT[d.weekday]} {n}
                      </span>
                    );
                  })}
                </div>
                {p.note && <p className="mt-1 text-[12px] italic text-gray-600">“{p.note}”</p>}
              </div>
              <button type="button" onClick={() => setOpen(p)}
                className="rounded-lg bg-violet-600 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-violet-700">
                Programı aç ve onayla
              </button>
            </div>
          );
        })}
      </div>
      {open && <ProgramReview item={{ kind: 'program', row: open }} onClose={() => setOpen(null)} />}
    </div>
  );
}
