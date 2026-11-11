'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import {
  TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcExamNet, calcNetYKS, calcNetLGS, emptyResult,
  type ResultMap, type SubjectDef,
} from '../../denemeler/examConstants';
import { subjectEmoji } from '../studentUi';

type ExamType = 'TYT' | 'AYT' | 'LGS';
const SUBJECTS: Record<ExamType, SubjectDef[]> = { TYT: TYT_SUBJECTS, AYT: AYT_SUBJECTS, LGS: LGS_SUBJECTS };
const MAX: Record<ExamType, number> = { TYT: 120, AYT: 160, LGS: 90 };
const init = (t: ExamType): ResultMap => Object.fromEntries(SUBJECTS[t].map((s) => [s.key, emptyResult()]));
const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const num = (v: string | undefined) => Number(v) || 0;

const field = 'w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2.5 text-[15px] font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';
const small = 'w-full rounded-xl border-2 border-[var(--border)] bg-white px-1 py-2 text-center text-[15px] font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';

/** Öğrencinin kendi deneme sonucunu girdiği / düzelttiği form. exam verilirse düzenleme. */
export function DenemeGirisClient({ studentId, track, exam }: { studentId: string; track: string | null; exam?: any }) {
  const router = useRouter();
  const supabase = createClient();
  const defaultType: ExamType = exam?.exam_type ?? (track === 'LGS' ? 'LGS' : 'TYT');
  const [type, setType] = useState<ExamType>(defaultType);
  const [name, setName] = useState<string>(exam?.exam_name ?? '');
  const [date, setDate] = useState<string>(exam?.exam_date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  const [results, setResults] = useState<Record<ExamType, ResultMap>>(() => ({
    TYT: init('TYT'), AYT: init('AYT'), LGS: init('LGS'),
    ...(exam?.subject_results ? { [exam.exam_type]: { ...init(exam.exam_type), ...exam.subject_results } } : {}),
  }));
  const puanKey = type === 'TYT' ? 'tyt_puan' : type === 'LGS' ? 'lgs_puan' : null;
  const [puan, setPuan] = useState<Record<string, string>>(() => ({
    tyt_puan: exam?.tyt_puan?.toString() ?? '', lgs_puan: exam?.lgs_puan?.toString() ?? '',
    say_puan: exam?.say_puan?.toString() ?? '', ea_puan: exam?.ea_puan?.toString() ?? '', soz_puan: exam?.soz_puan?.toString() ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = SUBJECTS[type];
  const res = results[type];
  const total = calcExamNet(type, res);
  const matGeo = num(res.matematik?.dogru) + num(res.matematik?.yanlis) + num(res.geometri?.dogru) + num(res.geometri?.yanlis);
  const limitOf = (s: SubjectDef) => (s.optional ? 40 : s.total);

  function set(key: string, part: 'dogru' | 'yanlis', v: string) {
    setResults((p) => ({ ...p, [type]: { ...p[type], [key]: { ...p[type][key], [part]: v } } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Denemenin adını yaz (ör. Özdebir TYT 3).'); return; }
    const over = subjects.find((s) => num(res[s.key]?.dogru) + num(res[s.key]?.yanlis) > s.total);
    if (over) { setError(`${over.label}: doğru + yanlış, soru sayısını (${over.total}) geçemez.`); return; }
    if (type !== 'LGS' && matGeo > 40) { setError('Matematik + geometri toplam 40 soruyu geçemez.'); return; }
    if (subjects.every((s) => num(res[s.key]?.dogru) + num(res[s.key]?.yanlis) === 0)) { setError('En az bir dersin doğru/yanlış sayısını yaz.'); return; }
    setBusy(true); setError(null);
    const p = (k: string) => (puan[k] ? Number(puan[k].replace(',', '.')) || null : null);
    const row = {
      student_id: studentId, exam_name: name.trim(), exam_date: date, exam_type: type,
      net_score: total, max_score: MAX[type], subject_results: res,
      tyt_puan: type === 'TYT' ? p('tyt_puan') : null, lgs_puan: type === 'LGS' ? p('lgs_puan') : null,
      say_puan: type === 'AYT' ? p('say_puan') : null, ea_puan: type === 'AYT' ? p('ea_puan') : null,
      soz_puan: type === 'AYT' ? p('soz_puan') : null,
    };
    const { error: err } = exam
      ? await (supabase as any).from('exams').update(row).eq('id', exam.id)
      : await (supabase as any).from('exams').insert(row);
    setBusy(false);
    if (err) { setError('Kaydedilemedi: ' + err.message); return; }
    router.push('/ogrenci/denemeler');
    router.refresh();
  }

  async function remove() {
    if (!exam || !window.confirm('Bu deneme sonucunu silmek istiyor musun?')) return;
    setBusy(true);
    const { error: err } = await (supabase as any).from('exams').delete().eq('id', exam.id);
    setBusy(false);
    if (err) { setError('Silinemedi: ' + err.message); return; }
    router.push('/ogrenci/denemeler');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/ogrenci/denemeler" className="rounded-full p-2 text-[var(--ink-muted)] hover:bg-[var(--card)]"><IconArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--ink)]">📝 {exam ? 'Deneme sonucunu düzelt' : 'Deneme sonucu ekle'}</h1>
          <p className="text-[13px] font-medium text-[var(--ink-muted)]">Doğru ve yanlışlarını yaz, netin otomatik hesaplanır.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex gap-2">
          {(['TYT', 'AYT', 'LGS'] as ExamType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} disabled={!!exam && exam.exam_type !== t}
              className={`flex-1 rounded-full py-2 text-[14px] font-extrabold transition-colors disabled:opacity-40 ${type === t ? 'bg-[var(--accent)] text-white shadow-sm' : 'border-2 border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
              {t}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">Deneme adı</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="ör. Özdebir TYT 3" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">Tarih</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
      </div>

      <div className="space-y-2 rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
          <span className="flex-1">Ders</span>
          <span className="w-14 text-center text-[var(--success)]">Doğru</span>
          <span className="ml-1.5 w-14 text-center text-[var(--danger)]">Yanlış</span>
          <span className="w-12 text-right">Net</span>
        </div>
        {subjects.map((s) => {
          const d = num(res[s.key]?.dogru); const y = num(res[s.key]?.yanlis);
          const net = type === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y);
          const over = d + y > limitOf(s);
          return (
            <div key={s.key} className={`flex items-center gap-1.5 rounded-2xl px-2 py-1.5 ${over ? 'bg-[var(--danger-soft)]' : 'bg-[var(--paper)]'}`}>
              <span className="min-w-0 flex-1 text-[13px] font-bold leading-tight text-[var(--ink)]">
                {subjectEmoji(s.label)} {s.label} <span className="font-medium text-[var(--ink-muted)]">/{s.total}</span>
              </span>
              <input type="number" inputMode="numeric" min={0} max={s.total} value={res[s.key]?.dogru ?? ''} placeholder="0"
                onChange={(e) => set(s.key, 'dogru', e.target.value)} className={`${small} w-14 flex-shrink-0`} aria-label={`${s.label} doğru`} />
              <input type="number" inputMode="numeric" min={0} max={s.total} value={res[s.key]?.yanlis ?? ''} placeholder="0"
                onChange={(e) => set(s.key, 'yanlis', e.target.value)} className={`${small} w-14 flex-shrink-0`} aria-label={`${s.label} yanlış`} />
              <span className="w-12 flex-shrink-0 text-right text-[14px] font-extrabold text-[var(--accent-dark)]">{d + y ? fmt(net) : '–'}</span>
            </div>
          );
        })}
        {type !== 'LGS' && matGeo > 40 && <p className="text-[12px] font-bold text-[var(--danger)]">Matematik + geometri toplam 40 soruyu geçemez ({matGeo}).</p>}
        <div className="mt-2 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-center">
          <span className="text-[13px] font-bold text-[var(--accent-dark)]">🎯 Toplam net </span>
          <span className="text-[24px] font-extrabold text-[var(--accent-dark)]">{fmt(total)}</span>
          <span className="text-[13px] font-bold text-[var(--accent-dark)]"> / {MAX[type]}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <span className="block text-[13px] font-bold text-[var(--ink-muted)]">⭐ Puan <span className="font-medium">(deneme sonucunda yazıyorsa, isteğe bağlı)</span></span>
        {puanKey ? (
          <input inputMode="decimal" value={puan[puanKey]} onChange={(e) => setPuan((p) => ({ ...p, [puanKey]: e.target.value }))} placeholder="ör. 412,5" className={field} />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {([['say_puan', 'Sayısal'], ['ea_puan', 'Eşit Ağ.'], ['soz_puan', 'Sözel']] as const).map(([k, l]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[12px] font-bold text-[var(--ink-muted)]">{l}</span>
                <input inputMode="decimal" value={puan[k]} onChange={(e) => setPuan((p) => ({ ...p, [k]: e.target.value }))} placeholder="–" className={field} />
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}

      <div className="sticky bottom-24 z-10 flex gap-2 rounded-full bg-[var(--card)]/95 p-1.5 shadow-lg backdrop-blur md:bottom-4">
        {exam && (
          <button type="button" disabled={busy} onClick={remove} className="rounded-full border-2 border-[var(--danger)]/30 px-4 py-3 text-[14px] font-bold text-[var(--danger)] disabled:opacity-50">Sil</button>
        )}
        <button type="submit" disabled={busy} className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm hover:bg-[var(--accent-dark)] disabled:opacity-50">
          {busy ? 'Kaydediliyor…' : exam ? 'Kaydet' : 'Kaydet 🚀'}
        </button>
      </div>
    </form>
  );
}
