'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS } from '@/app/denemeler/examConstants';
import { ERROR_TYPES, type SelfAnalysisItem } from '@/lib/exam-error-types';
import { subjectEmoji } from '../../../studentUi';

const ALL = [...TYT_SUBJECTS, ...AYT_SUBJECTS, ...LGS_SUBJECTS];
const LABEL: Record<string, string> = Object.fromEntries(ALL.map((s) => [s.key, s.label]));
const label = (k: string) => LABEL[k] ?? k.charAt(0).toLocaleUpperCase('tr') + k.slice(1);

type Row = { key: string; subject: string; title: string; detail: string; blank: boolean };

/** Analiz edilecek satırlar: karnede soru verisi varsa yanlış/boş her soru, yoksa yanlış/boşu olan her ders */
function buildRows(exam: any): Row[] {
  const qs: any[] = Array.isArray(exam.question_results) ? exam.question_results : [];
  if (qs.length) {
    return qs.filter((q) => q?.r === 'Y' || q?.r === 'B').map((q) => ({
      key: `${q.s}|${q.n}`, subject: label(q.s), title: `${q.n}. soru · ${q.k ?? ''}`.trim(),
      detail: q.r === 'B' ? `Boş bıraktın · doğru cevap ${q.dc ?? '–'}` : `Senin cevabın ${q.oc ?? '–'} · doğru cevap ${q.dc ?? '–'}`,
      blank: q.r === 'B',
    }));
  }
  const subjects = exam.exam_type === 'AYT' ? AYT_SUBJECTS : exam.exam_type === 'LGS' ? LGS_SUBJECTS : TYT_SUBJECTS;
  return subjects.flatMap((s) => {
    const r = exam.subject_results?.[s.key];
    if (!r) return [];
    const d = Number(r.dogru) || 0; const y = Number(r.yanlis) || 0;
    const b = Math.max(0, s.total - d - y);
    if (y + b === 0) return [];
    return [{ key: `ders:${s.key}`, subject: s.label, title: s.label, detail: `${y} yanlış${b ? `, ${b} boş` : ''}`, blank: y === 0 }];
  });
}

export function DenemeAnalizClient({ exam }: { exam: any }) {
  const router = useRouter();
  const rows = useMemo(() => buildRows(exam), [exam]);
  const byQuestion = Array.isArray(exam.question_results) && exam.question_results.length > 0;
  const [items, setItems] = useState<Record<string, SelfAnalysisItem>>(() => {
    const saved: SelfAnalysisItem[] = exam.student_analysis?.items ?? [];
    return Object.fromEntries(saved.map((i) => [i.key, i]));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const answered = rows.filter((r) => items[r.key]?.type).length;
  const subjects = Array.from(new Set(rows.map((r) => r.subject)));
  const counts = ERROR_TYPES.map((t) => ({ ...t, n: Object.values(items).filter((i) => i.type === t.key && rows.some((r) => r.key === i.key)).length }))
    .filter((t) => t.n > 0);

  function set(key: string, patch: Partial<SelfAnalysisItem>) {
    setItems((p) => ({ ...p, [key]: { ...(p[key] ?? { key, type: '', note: '' }), ...patch, key } }));
    setSaved(null);
  }

  async function save(done: boolean) {
    if (done && answered < rows.length) {
      setError(`Analizi bitirmek için her soruya hata türü seç (${rows.length - answered} soru kaldı).`);
      return;
    }
    setBusy(true); setError(null);
    const list = rows.map((r) => items[r.key]).filter((i): i is SelfAnalysisItem => !!i && (!!i.type || !!i.note?.trim()));
    const { error: err } = await (createClient() as any).rpc('save_exam_self_analysis', { p_exam: exam.id, p_items: list, p_done: done });
    setBusy(false);
    if (err) { setError(err.code === 'PGRST202' ? 'Bu özellik henüz etkin değil.' : 'Kaydedilemedi: ' + err.message); return; }
    if (done) { router.push('/ogrenci/denemeler'); router.refresh(); return; }
    setSaved('Kaydedildi. Kaldığın yerden devam edebilirsin.');
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <Link href="/ogrenci/denemeler" className="rounded-full p-2 text-[var(--ink-muted)] hover:bg-[var(--card)]"><IconArrowLeft size={20} /></Link>
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--ink)]">🔍 Deneme analizi</h1>
          <p className="truncate text-[13px] font-medium text-[var(--ink-muted)]">{exam.exam_name} · {exam.exam_type} · {Number(exam.net_score).toLocaleString('tr-TR')} net</p>
        </div>
      </div>

      <div className="rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-[13.5px] font-semibold text-[var(--ink)]">
          {byQuestion
            ? 'Yanlış yaptığın ve boş bıraktığın her soruya bak: neden kaçırdın? Hata türünü seç, istersen kısa bir not yaz.'
            : 'Bu denemede soru soru veri yok. Yanlışı/boşu olan her ders için en çok hangi sebepten kaçırdığını seç, notuna ayrıntıyı yaz (ör. "3 dikkat, 2 konu eksiği").'}
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--accent-soft)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#2F9BEA] via-[#8B5CF6] to-[#EC4899] transition-all" style={{ width: `${rows.length ? (answered / rows.length) * 100 : 100}%` }} />
        </div>
        <p className="mt-1 text-[12px] font-bold text-[var(--ink-muted)]">{answered}/{rows.length} {byQuestion ? 'soru' : 'ders'} analiz edildi</p>
        {counts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {counts.map((c) => <span key={c.key} className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[12px] font-bold text-[var(--ink)]">{c.emoji} {c.label}: {c.n}</span>)}
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <div className="rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="mb-2 text-[44px]">🌟</div>
          <p className="text-[15px] font-bold text-[var(--ink)]">Bu denemede yanlışın ya da boşun yok!</p>
        </div>
      )}

      {subjects.map((subj) => (
        <div key={subj} className="space-y-2">
          <h2 className="px-1 text-[15px] font-extrabold text-[var(--ink)]">{subjectEmoji(subj)} {subj}</h2>
          {rows.filter((r) => r.subject === subj).map((r) => {
            const it = items[r.key];
            return (
              <div key={r.key} className={`rounded-[20px] border-2 bg-[var(--card)] p-3 ${it?.type ? 'border-[var(--success)]/30' : 'border-[var(--border)]'}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${r.blank ? 'bg-[var(--paper)] text-[var(--ink-muted)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>{r.blank ? 'BOŞ' : 'YANLIŞ'}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold leading-snug text-[var(--ink)]">{r.title}</p>
                    <p className="text-[12px] font-medium text-[var(--ink-muted)]">{r.detail}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ERROR_TYPES.map((t) => (
                    <button key={t.key} type="button" title={t.hint} onClick={() => set(r.key, { type: it?.type === t.key ? '' : t.key })}
                      className={`rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors ${it?.type === t.key ? 'bg-[var(--accent)] text-white shadow-sm' : 'border-2 border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
                <input value={it?.note ?? ''} onChange={(e) => set(r.key, { note: e.target.value })} maxLength={300}
                  placeholder="Not (isteğe bağlı): bu sorunun hikâyesi…"
                  className="mt-2 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-[13px] focus:border-[var(--accent)] focus:outline-none" />
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}
      {saved && <p className="rounded-2xl bg-[var(--success-soft)] px-3 py-2 text-[13px] font-bold text-[var(--success)]">{saved}</p>}

      {rows.length > 0 && (
        <div className="sticky bottom-24 z-10 flex gap-2 rounded-full bg-[var(--card)]/95 p-1.5 shadow-lg backdrop-blur md:bottom-4">
          <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-full border-2 border-[var(--border)] px-4 py-3 text-[14px] font-bold text-[var(--ink-muted)] disabled:opacity-50">Kaydet</button>
          <button type="button" disabled={busy} onClick={() => save(true)}
            className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm hover:bg-[var(--accent-dark)] disabled:opacity-50">
            {busy ? 'Kaydediliyor…' : 'Analizi bitir ✅'}
          </button>
        </div>
      )}
    </div>
  );
}
