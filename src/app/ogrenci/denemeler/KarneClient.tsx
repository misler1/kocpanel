'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import {
  TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS, type SubjectDef,
} from '../../denemeler/examConstants';
import { subjectEmoji } from '../studentUi';

type Rank = { exam_id: string; rank: number; total: number; avg_net: number; max_net: number };

const subjectsFor = (t: string): SubjectDef[] =>
  t === 'TYT' ? TYT_SUBJECTS : t === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;

const netOf = (r: any, type: string) => {
  const d = Number(r?.dogru) || 0;
  const y = Number(r?.yanlis) || 0;
  return type === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y);
};
const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

function Karne({ exam, rank, prev }: { exam: any; rank?: Rank; prev?: any }) {
  const subjects = subjectsFor(exam.exam_type);
  const date = new Date(exam.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const puan = exam.exam_type === 'LGS' ? exam.lgs_puan : exam.exam_type === 'TYT' ? exam.tyt_puan : (exam.say_puan ?? exam.ea_puan ?? exam.soz_puan);
  const diff = prev ? Number(exam.net_score) - Number(prev.net_score) : null;
  const up = diff !== null && diff >= 0;

  return (
    <div className="overflow-hidden rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[var(--sun-soft)] to-[var(--pink-soft)] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[22px] shadow-sm">📝</span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-[var(--ink)]">{exam.exam_name}</div>
            <div className="text-[12px] font-semibold text-[var(--ink-muted)]">{date}</div>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-[var(--accent-dark)] shadow-sm">{exam.exam_type}</span>
          {exam.entered_by_student && (
            <Link href={`/ogrenci/denemeler/${exam.id}`} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[var(--ink-muted)] hover:bg-white hover:text-[var(--accent-dark)]">✏️ Düzelt</Link>
          )}
          <AnalizButton exam={exam} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3.5">
        <div className="rounded-2xl bg-[var(--accent-soft)] p-2.5 text-center">
          <div className="text-[18px]">🎯</div>
          <div className="text-[11px] font-bold text-[var(--accent-dark)]">Toplam Net</div>
          <div className="text-[22px] font-extrabold leading-tight text-[var(--accent-dark)]">{fmt(Number(exam.net_score))}</div>
          {diff !== null && (
            <div className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${up ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>
              {up ? '▲' : '▼'} {fmt(Math.abs(diff))}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-[var(--sun-soft)] p-2.5 text-center">
          <div className="text-[18px]">🏆</div>
          <div className="text-[11px] font-bold text-[#B76E00]">Sıralama</div>
          <div className="text-[22px] font-extrabold leading-tight text-[#8A5300]">
            {rank ? `${rank.rank}` : '–'}<span className="text-[13px] font-bold">{rank ? ` / ${rank.total}` : ''}</span>
          </div>
          {rank && rank.total < 2 && <div className="text-[10px] font-semibold text-[#B76E00]">karşılaştırılacak öğrenci yok</div>}
        </div>
        <div className="rounded-2xl bg-[var(--success-soft)] p-2.5 text-center">
          <div className="text-[18px]">{puan ? '⭐' : '📊'}</div>
          <div className="text-[11px] font-bold text-[var(--success)]">{puan ? 'Puan' : 'Ortalama Net'}</div>
          <div className="text-[22px] font-extrabold leading-tight text-[var(--success)]">{puan ? fmt(Number(puan)) : rank ? fmt(Number(rank.avg_net)) : '–'}</div>
          {rank && puan && <div className="text-[10px] font-semibold text-[var(--success)]">ort. net {fmt(Number(rank.avg_net))}</div>}
        </div>
      </div>

      {diff !== null && (
        <p className="mx-3.5 mb-3 rounded-xl bg-[var(--paper)] px-3 py-2 text-[12.5px] font-bold text-[var(--ink)]">
          {up
            ? `Önceki denemene göre ${fmt(diff)} net arttı, süpersin! 🎉`
            : `Önceki denemene göre ${fmt(Math.abs(diff))} net düştü. Bir sonrakinde telafi edersin! 💪`}
        </p>
      )}

      <div className="space-y-1.5 px-3.5 pb-3.5">
        <div className="flex px-2 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
          <span className="flex-1">Ders</span>
          <span className="w-9 text-center text-[var(--success)]">D</span>
          <span className="w-9 text-center text-[var(--danger)]">Y</span>
          <span className="w-9 text-center">B</span>
          <span className="w-14 text-right">Net</span>
        </div>
        {subjects.map((s) => {
          const r = exam.subject_results?.[s.key];
          if (!r) return null;
          const d = Number(r.dogru) || 0;
          const y = Number(r.yanlis) || 0;
          const net = netOf(r, exam.exam_type);
          const pr = prev?.subject_results?.[s.key];
          const pnet = pr ? netOf(pr, prev.exam_type) : null;
          const pct = s.total > 0 ? Math.max(0, Math.min(100, (net / s.total) * 100)) : 0;
          return (
            <div key={s.key} className="rounded-xl bg-[var(--paper)] px-2 py-1.5">
              <div className="flex items-center text-[12.5px]">
                <span className="min-w-0 flex-1 truncate font-bold text-[var(--ink)]">
                  {subjectEmoji(s.label)} {s.label} <span className="font-medium text-[var(--ink-muted)]">({s.total})</span>
                </span>
                <span className="w-9 text-center font-bold text-[var(--success)]">{d}</span>
                <span className="w-9 text-center font-bold text-[var(--danger)]">{y}</span>
                <span className="w-9 text-center font-semibold text-[var(--ink-muted)]">{Math.max(0, s.total - d - y)}</span>
                <span className="w-14 text-right font-extrabold text-[var(--ink)]">
                  {fmt(net)}
                  {pnet !== null && net !== pnet && (
                    <span className={`ml-0.5 text-[10px] ${net > pnet ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{net > pnet ? '▲' : '▼'}</span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {rank && <p className="pt-1 text-[12px] font-semibold text-[var(--ink-muted)]">👥 Grup ortalaması {fmt(Number(rank.avg_net))} net · en yüksek {fmt(Number(rank.max_net))} net</p>}
      </div>
    </div>
  );
}

const MAX_NET: Record<string, number> = { TYT: 120, AYT: 160, LGS: 90 };

/** Denemenin yanında "Analiz yap" / "Analiz edildi" (öğrencinin kendi analizi; koçun "analiz yapıldı" işaretine bağlı) */
function AnalizButton({ exam }: { exam: any }) {
  const done = !!exam.analysis_done || !!exam.student_analysis?.done_at;
  return (
    <Link href={`/ogrenci/denemeler/${exam.id}/analiz`}
      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${done ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]'}`}>
      {done ? '✓ Analiz edildi' : '🔍 Analiz yap'}
    </Link>
  );
}

/** Liste görünümü: denemeler alt alta, her birinde net, önceki aynı tür denemeye göre değişim ve net çubuğu */
function ExamList({ exams, list, rankMap }: { exams: any[]; list: any[]; rankMap: Map<string, Rank> }) {
  return (
    <div className="overflow-hidden rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)]">
      {list.map((e, i) => {
        const prev = exams.find((o) => o.exam_type === e.exam_type && o.exam_date < e.exam_date);
        const net = Number(e.net_score);
        const diff = prev ? net - Number(prev.net_score) : null;
        const max = Number(e.max_score) || MAX_NET[e.exam_type] || 120;
        const pct = Math.max(0, Math.min(100, (net / max) * 100));
        const rank = rankMap.get(e.id);
        return (
          <div key={e.id} className={`px-4 py-3 ${i ? 'border-t border-[var(--border)]' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="w-12 flex-shrink-0 rounded-full bg-[var(--accent-soft)] py-0.5 text-center text-[11px] font-extrabold text-[var(--accent-dark)]">{e.exam_type}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-[var(--ink)]">{e.exam_name}</div>
                <div className="text-[11.5px] font-semibold text-[var(--ink-muted)]">
                  {new Date(e.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {rank && rank.total > 1 ? ` · ${rank.rank}/${rank.total}. sıra` : ''}
                </div>
              </div>
              <AnalizButton exam={e} />
              <div className="flex-shrink-0 text-right">
                <div className="text-[17px] font-extrabold text-[var(--ink)]">{fmt(net)}</div>
                {diff !== null && (
                  <div className={`text-[11.5px] font-extrabold ${diff >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--paper)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KarneClient({ exams, ranks }: { exams: any[]; ranks: Rank[] }) {
  const types = Array.from(new Set(exams.map((e) => e.exam_type).filter(Boolean))) as string[];
  const [type, setType] = useState<string>('hepsi');
  const [view, setView] = useState<'karne' | 'liste'>('karne');
  const list = type === 'hepsi' ? exams : exams.filter((e) => e.exam_type === type);
  const rankMap = new Map(ranks.map((r) => [r.exam_id, r]));

  if (exams.length === 0) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mb-2 text-[48px]">🎯</div>
        <p className="text-[15px] font-bold text-[var(--ink)]">Henüz deneme sonucun yok.</p>
        <p className="text-[13px] text-[var(--ink-muted)]">İlk denemeni çözdüğünde sonucunu buraya ekle, karnen oluşsun.</p>
        <Link href="/ogrenci/denemeler/yeni" className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14px] font-extrabold text-white shadow-sm hover:bg-[var(--accent-dark)]">+ Deneme sonucu ekle</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--ink)]">🏆 Deneme Karnelerim</h1>
          <p className="text-[13px] font-medium text-[var(--ink-muted)]">Toplam {exams.length} deneme çözdün. Her deneme bir adım ileri!</p>
        </div>
        <Link href="/ogrenci/denemeler/yeni" className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-extrabold text-white shadow-sm hover:bg-[var(--accent-dark)]">+ Deneme ekle</Link>
      </div>
      {types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {['hepsi', ...types].map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${
                type === t ? 'bg-[var(--accent)] text-white shadow-sm' : 'border-2 border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
              {t === 'hepsi' ? 'Hepsi' : t}
            </button>
          ))}
        </div>
      )}
      <div className="inline-flex rounded-full border-2 border-[var(--border)] bg-[var(--card)] p-1">
        {([['karne', '🗂️ Karne'], ['liste', '📈 Liste']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${view === v ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
            {l}
          </button>
        ))}
      </div>
      {view === 'liste' ? <ExamList exams={exams} list={list} rankMap={rankMap} /> : list.map((e) => {
        // aynı türdeki bir önceki deneme (liste tarihe göre azalan)
        const prev = exams.find((o) => o.exam_type === e.exam_type && o.exam_date < e.exam_date);
        return <Karne key={e.id} exam={e} rank={rankMap.get(e.id)} prev={prev} />;
      })}
    </div>
  );
}
