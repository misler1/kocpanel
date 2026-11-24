'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addDays, DAY_NAMES, programDays, shortDate } from '@/lib/program-days';
import { subjectEmoji } from '../studentUi';

/** Öğrencinin kendi yaptığı, koç onayı bekleyen (ya da yakında reddedilen) programlar: salt okunur önizleme. */
export function PendingPrograms({ programs, coachWeeks = [] }: { programs: any[]; coachWeeks?: { ws: string; we: string | null }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (programs.length === 0) return null;

  async function withdraw(id: string) {
    if (!window.confirm('Onaya gönderdiğin programı geri çekmek istiyor musun?')) return;
    setBusy(true);
    await (createClient() as any).rpc('withdraw_student_program', { p_id: id });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {programs.map((p) => {
        const pending = p.status === 'bekliyor';
        const tasks: any[] = Array.isArray(p.tasks) ? p.tasks : [];
        const overCoach = coachWeeks.some((w) => w.ws <= p.week_end && (w.we ?? addDays(w.ws, 6)) >= p.week_start);
        return (
          <div key={p.id} className={`rounded-[24px] border-2 p-4 ${pending ? 'border-[var(--sun)]/40 bg-[var(--sun-soft)]' : 'border-[var(--danger)]/25 bg-[var(--danger-soft)]'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`min-w-0 flex-1 text-[13.5px] font-bold ${pending ? 'text-[#8A5300]' : 'text-[var(--danger)]'}`}>
                {pending
                  ? `⏳ Kendi yaptığın program (${shortDate(p.week_start)} – ${shortDate(p.week_end)}) koçunun onayını bekliyor.${overCoach ? ' Şimdilik işaretlemeyi koçunun programında yap.' : ' Onaylanınca programın olarak başlar.'}`
                  : `Kendi yaptığın program (${shortDate(p.week_start)} – ${shortDate(p.week_end)}) onaylanmadı${overCoach ? '; koçunun programı geçerli.' : '.'}`}
              </p>
              <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)}
                className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--ink)] shadow-sm">
                {open === p.id ? 'Gizle' : `Programımı gör (${tasks.length})`}
              </button>
              {pending && (
                <Link href={`/ogrenci/haftalik-takip/program-yap?duzenle=${p.id}`}
                  className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--accent-dark)] shadow-sm">Düzenle</Link>
              )}
              {pending && (
                <button type="button" disabled={busy} onClick={() => withdraw(p.id)}
                  className="rounded-full border-2 border-white/70 px-3 py-1.5 text-[12px] font-bold text-[var(--ink-muted)] disabled:opacity-50">Geri çek</button>
              )}
            </div>
            {open === p.id && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {programDays(p.week_start, p.week_end).map((d) => {
                  const list = tasks.filter((t) => t.plan_day === d.weekday);
                  if (list.length === 0) return null;
                  return (
                    <div key={d.weekday} className="rounded-2xl bg-white/80 p-2.5">
                      <p className="mb-1 text-[12px] font-extrabold text-[var(--ink)]">{DAY_NAMES[d.weekday]} {d.date && <span className="font-bold text-[var(--ink-muted)]">{shortDate(d.date)}</span>}</p>
                      {list.map((t, i) => (
                        <p key={i} className="text-[12.5px] font-semibold text-[var(--ink)]">
                          {subjectEmoji(t.subject)} {t.subject}{t.topic ? ` · ${t.topic}` : ''}{t.target_count ? ` · ${t.target_count} soru` : ''}
                          {t.start_time ? <span className="text-[var(--ink-muted)]"> · {t.start_time}{t.end_time ? `–${t.end_time}` : ''}</span> : null}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
