'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconBooks, IconPencil, IconListCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { isTopicDone, TOPIC_FLAG_COLUMNS } from '@/lib/topic-done';

// Öğrencinin kullandığı kaynaklar ve her kaynağın ilerlemesi.
// İlerleme Konu ilerleyişinden gelir: dersin konularından kaçında "N. kaynaktan soru çözüldü" işaretli.
const SOURCE_KEYS = ['kaynak1_sorular', 'kaynak2_sorular', 'kaynak3_sorular'] as const;

function Bar({ value, total, tone }: { value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--paper)] ring-1 ring-inset ring-[var(--border)]">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function KaynaklarPanel({ studentId, resources, subjectOrder, canEdit }: {
  studentId: string;
  resources: Record<string, [string, string, string]>;
  /** Alanın ders sırası (TRACK_RESOURCES); yoksa kayıt sırası */
  subjectOrder: string[] | null;
  canEdit: boolean;
}) {
  const [topics, setTopics] = useState<any[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (createClient() as any).from('topic_progress').select(`subject, ${TOPIC_FLAG_COLUMNS}`).eq('student_id', studentId).limit(5000)
      .then(({ data }: any) => { if (!cancelled) setTopics(data ?? []); });
    return () => { cancelled = true; };
  }, [studentId]);

  const rows = useMemo(() => {
    const bySubject = new Map<string, any[]>();
    for (const t of topics ?? []) {
      const k = (t.subject ?? '').trim();
      if (!bySubject.has(k)) bySubject.set(k, []);
      bySubject.get(k)!.push(t);
    }
    const subjects = [...new Set([
      ...(subjectOrder ?? []).filter((s) => resources[s]?.some(Boolean) || bySubject.has(s)),
      ...Object.keys(resources).filter((s) => resources[s]?.some(Boolean)),
      ...bySubject.keys(),
    ])].filter(Boolean);
    return subjects.map((subject) => {
      const list = bySubject.get(subject) ?? [];
      const books = (resources[subject] ?? ['', '', '']).map((name, i) => ({
        name: (name ?? '').trim(), index: i,
        solved: list.filter((t) => t[SOURCE_KEYS[i]]).length,
      })).filter((b) => b.name || b.solved > 0);
      return { subject, total: list.length, done: list.filter((t) => isTopicDone(t)).length, books };
    });
  }, [topics, resources, subjectOrder]);

  const totalBooks = rows.reduce((s, r) => s + r.books.filter((b) => b.name).length, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B4A8A] text-white"><IconBooks size={18} /></span>
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">Kaynaklar</p>
            <p className="text-[12px] text-[var(--ink-muted)]">İlerleme Konu ilerleyişindeki &quot;kaynaktan soru çözüldü&quot; işaretlerinden hesaplanır.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
          <Link href={`/konu-ilerleyisi?ogrenci=${studentId}`}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[var(--ink)] hover:bg-[var(--paper)]">
            <IconListCheck size={15} /> Konu ilerleyişi
          </Link>
          {canEdit && (
            <Link href={`/ogrenciler/${studentId}/duzenle`}
              className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[var(--ink)] hover:bg-[var(--paper)]">
              <IconPencil size={15} /> Kaynakları düzenle
            </Link>
          )}
        </div>
      </div>

      {topics === null ? (
        <p className="py-8 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-[13px] text-[var(--ink-muted)]">
          Henüz kaynak girilmemiş. {canEdit && <Link href={`/ogrenciler/${studentId}/duzenle`} className="font-semibold text-[var(--accent-dark)] hover:underline">Kaynak ekle</Link>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <section key={r.subject} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <h3 className="text-[14.5px] font-semibold text-[var(--ink)]">{r.subject}</h3>
                <span className="text-[12px] text-[var(--ink-muted)]">
                  {r.total ? `${r.done}/${r.total} konu tamamlandı` : 'Konu ilerleyişinde konu yok'}
                </span>
              </div>
              {r.books.length === 0 ? (
                <p className="text-[12.5px] text-[var(--ink-muted)]">Bu ders için kaynak girilmemiş.</p>
              ) : (
                <ul className="space-y-2.5">
                  {r.books.map((b) => {
                    const pct = r.total ? Math.round((b.solved / r.total) * 100) : 0;
                    return (
                      <li key={b.index}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="min-w-0 truncate text-[var(--ink)]">
                            <span className="mr-1.5 text-[11px] font-semibold text-[var(--ink-muted)]">{b.index + 1}.</span>
                            {b.name || <i className="text-[var(--ink-muted)]">Adı girilmemiş kaynak</i>}
                          </span>
                          <span className="flex-shrink-0 text-[12px] font-semibold text-[var(--ink-muted)]">
                            {r.total ? <>{b.solved}/{r.total} konu · <span className={pct >= 100 ? 'text-[var(--success)]' : 'text-[var(--ink)]'}>%{pct}</span></> : '–'}
                          </span>
                        </div>
                        <Bar value={b.solved} total={r.total} tone={pct >= 100 ? 'bg-[var(--success)]' : 'bg-gradient-to-r from-[#1B4A8A] to-[#0FA3A8]'} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      {totalBooks > 0 && (
        <p className="px-1 text-[11.5px] text-[var(--ink-muted)]">
          Bir kaynağın yüzdesi: o dersin Konu ilerleyişindeki konularından kaçında bu kaynaktan soru çözüldüğü.
        </p>
      )}
    </div>
  );
}
