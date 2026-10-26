'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import {
  TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS, type SubjectDef,
} from '../../denemeler/examConstants';

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

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] bg-[var(--paper)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{exam.exam_name}</div>
            <div className="text-[11px] text-[var(--ink-muted)]">{date}</div>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-dark)]">{exam.exam_type}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3.5">
        <div className="rounded-lg bg-[var(--accent-soft)] p-2.5 text-center">
          <div className="text-[10px] text-[var(--accent-dark)]">Toplam Net</div>
          <div className="text-[18px] font-bold text-[var(--accent-dark)]">{fmt(Number(exam.net_score))}</div>
          {diff !== null && (
            <div className={`text-[10px] ${diff >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))} (önceki denemeye göre)
            </div>
          )}
        </div>
        <div className="rounded-lg bg-amber-50 p-2.5 text-center">
          <div className="text-[10px] text-amber-700">Sıralama</div>
          <div className="text-[18px] font-bold text-amber-800">
            {rank ? `${rank.rank}` : '–'}<span className="text-[12px] font-medium">{rank ? ` / ${rank.total}` : ''}</span>
          </div>
          {rank && rank.total < 2 && <div className="text-[10px] text-amber-700">karşılaştırılacak öğrenci yok</div>}
        </div>
        <div className="rounded-lg bg-[var(--success-soft)] p-2.5 text-center">
          <div className="text-[10px] text-[var(--success)]">{puan ? 'Puan' : 'Ortalama Net'}</div>
          <div className="text-[18px] font-bold text-[var(--success)]">{puan ? fmt(Number(puan)) : rank ? fmt(Number(rank.avg_net)) : '–'}</div>
          {rank && puan && <div className="text-[10px] text-[var(--success)]">ort. net {fmt(Number(rank.avg_net))}</div>}
        </div>
      </div>

      <div className="overflow-x-auto px-3.5 pb-3.5">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="py-1.5 pr-2 font-medium">Ders</th>
              <th className="px-2 text-right font-medium">Soru</th>
              <th className="px-2 text-right font-medium">D</th>
              <th className="px-2 text-right font-medium">Y</th>
              <th className="px-2 text-right font-medium">B</th>
              <th className="pl-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => {
              const r = exam.subject_results?.[s.key];
              if (!r) return null;
              const d = Number(r.dogru) || 0;
              const y = Number(r.yanlis) || 0;
              const net = netOf(r, exam.exam_type);
              const pr = prev?.subject_results?.[s.key];
              const pnet = pr ? netOf(pr, prev.exam_type) : null;
              return (
                <tr key={s.key} className="border-b border-[var(--border)]/60 last:border-0">
                  <td className="py-1.5 pr-2 text-[var(--ink)]">{s.label}</td>
                  <td className="px-2 text-right text-[var(--ink-muted)]">{s.total}</td>
                  <td className="px-2 text-right text-[var(--success)]">{d}</td>
                  <td className="px-2 text-right text-[var(--danger)]">{y}</td>
                  <td className="px-2 text-right text-[var(--ink-muted)]">{Math.max(0, s.total - d - y)}</td>
                  <td className="pl-2 text-right font-semibold text-[var(--ink)]">
                    {fmt(net)}
                    {pnet !== null && net !== pnet && (
                      <span className={`ml-1 text-[10px] ${net > pnet ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{net > pnet ? '▲' : '▼'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rank && <p className="mt-2 text-[11px] text-[var(--ink-muted)]">Sınıf ortalaması {fmt(Number(rank.avg_net))} net · en yüksek {fmt(Number(rank.max_net))} net</p>}
      </div>
    </div>
  );
}

export function KarneClient({ exams, ranks }: { exams: any[]; ranks: Rank[] }) {
  const types = Array.from(new Set(exams.map((e) => e.exam_type).filter(Boolean))) as string[];
  const [type, setType] = useState<string>('hepsi');
  const list = type === 'hepsi' ? exams : exams.filter((e) => e.exam_type === type);
  const rankMap = new Map(ranks.map((r) => [r.exam_id, r]));

  if (exams.length === 0) {
    return <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--ink-muted)]">Henüz deneme sonucun yok.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-medium text-[var(--ink)]">Deneme Karnelerim</h1>
        {types.length > 1 && (
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[13px]">
            <option value="hepsi">Hepsi</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>
      {list.map((e) => {
        // aynı türdeki bir önceki deneme (liste tarihe göre azalan)
        const prev = exams.find((o) => o.exam_type === e.exam_type && o.exam_date < e.exam_date);
        return <Karne key={e.id} exam={e} rank={rankMap.get(e.id)} prev={prev} />;
      })}
    </div>
  );
}
