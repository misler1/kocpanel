// Dönem raporu görünümü (src/lib/period-report.ts verisi). Öğrenci sayfasındaki rapor ekranında kullanılır; yazdırmaya uygundur.

import type { PeriodReportData } from '@/lib/period-report';

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { ...opts, timeZone: 'UTC' });
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ''}` : `${m} dk`);

function tone(p: number | null) {
  if (p === null) return { text: 'text-gray-400', bar: 'bg-gray-200', soft: 'bg-gray-50' };
  if (p >= 80) return { text: 'text-emerald-600', bar: 'bg-emerald-500', soft: 'bg-emerald-50' };
  if (p >= 50) return { text: 'text-amber-600', bar: 'bg-amber-500', soft: 'bg-amber-50' };
  return { text: 'text-rose-600', bar: 'bg-rose-500', soft: 'bg-rose-50' };
}

function Kpi({ label, value, sub, p }: { label: string; value: React.ReactNode; sub?: React.ReactNode; p?: number | null }) {
  const t = tone(p ?? null);
  return (
    <div className="print-avoid rounded-2xl border border-gray-100 bg-white p-3.5">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-0.5 text-[24px] font-bold leading-tight ${p !== undefined ? t.text : 'text-gray-900'}`}>{value}</div>
      {p !== undefined && p !== null && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${t.bar}`} style={{ width: `${Math.min(100, p)}%` }} /></div>}
      {sub && <div className="mt-1 text-[11.5px] text-gray-500">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid rounded-2xl border border-gray-100 bg-white p-4">
      <h2 className="mb-3 text-[15px] font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export function PeriodReportView({ r }: { r: PeriodReportData }) {
  const t = r.totals;
  const qDiff = t.questions - t.prevQuestions;
  return (
    <div className="space-y-3">
      <header className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
        <div className="text-[12px] font-semibold uppercase tracking-wide opacity-80">Gelişim raporu</div>
        <h1 className="text-[22px] font-bold">{r.student.full_name}</h1>
        <p className="text-[13.5px] opacity-90">
          {fmtDate(r.start)} – {fmtDate(r.end, { day: 'numeric', month: 'long', year: 'numeric' })}
          {r.student.sinif ? ` · ${r.student.sinif}` : ''}{r.coachName ? ` · Koç: ${r.coachName}` : ''}
        </p>
      </header>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <Kpi label="Programa uyum (hafta)" value={t.compliance === null ? '—' : `%${t.compliance}`} p={t.compliance}
          sub={t.planned ? `${t.done}/${t.planned} görev yapıldı${t.missed ? ` · ${t.missed} yapılmadı` : ''}` : 'Bu dönemde program yok'} />
        <Kpi label="Programa uyum (gün ort.)" value={t.dayAvgCompliance === null ? '—' : `%${t.dayAvgCompliance}`} p={t.dayAvgCompliance}
          sub={t.programDays ? `${t.programDays} programlı günün ${t.fullDays}'i tam` : undefined} />
        <Kpi label="Hedef soru gerçekleşme" value={t.targetRate === null ? '—' : `%${t.targetRate}`} p={t.targetRate}
          sub={t.target ? `${t.solvedForTasks} / ${t.target} hedef soru` : undefined} />
        <Kpi label="Çözülen soru" value={t.questions}
          sub={<>{t.prevQuestions || t.questions ? <span className={qDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{qDiff >= 0 ? '▲' : '▼'} {Math.abs(qDiff)}</span> : null} önceki döneme göre ({t.prevQuestions})</>} />
        <Kpi label="Doğruluk" value={t.accuracy === null ? '—' : `%${t.accuracy}`} p={t.accuracy}
          sub={t.correct + t.wrong ? `${t.correct} doğru · ${t.wrong} yanlış` : 'Doğru/yanlış girilmemiş'} />
        <Kpi label="Çalışma" value={fmtMin(t.minutes)} sub={`${t.activeDays} aktif gün`} />
      </div>

      {/* Gün gün */}
      <Section title="Gün gün">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-1 py-1.5 font-semibold">Gün</th>
                <th className="px-1 py-1.5 font-semibold">Görev</th>
                <th className="px-1 py-1.5 font-semibold">Uyum</th>
                <th className="px-1 py-1.5 text-right font-semibold">Hedef / çözülen</th>
                <th className="px-1 py-1.5 text-right font-semibold">Soru</th>
                <th className="px-1 py-1.5 text-right font-semibold">D / Y</th>
                <th className="px-1 py-1.5 text-right font-semibold">Süre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.days.map((d) => {
                const c = tone(d.compliance);
                return (
                  <tr key={d.date}>
                    <td className="px-1 py-2 font-medium text-gray-800">{DAY_NAMES[d.weekday]} <span className="text-gray-400">{fmtDate(d.date, { day: 'numeric', month: 'short' })}</span></td>
                    <td className="px-1 py-2 text-gray-700">
                      {d.planned ? <>{d.done}/{d.planned}{d.missed ? <span className="text-rose-500"> · {d.missed}✕</span> : null}</> : <span className="text-gray-300">program yok</span>}
                    </td>
                    <td className="px-1 py-2">
                      {d.compliance === null ? <span className="text-gray-300">—</span> : (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100"><span className={`block h-full ${c.bar}`} style={{ width: `${d.compliance}%` }} /></span>
                          <b className={c.text}>%{d.compliance}</b>
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-right text-gray-700">{d.target ? `${d.solvedForTasks} / ${d.target}` : '—'}</td>
                    <td className="px-1 py-2 text-right font-semibold text-gray-900">{d.questions || '—'}</td>
                    <td className="px-1 py-2 text-right text-gray-600">{d.correct + d.wrong ? `${d.correct} / ${d.wrong}` : '—'}</td>
                    <td className="px-1 py-2 text-right text-gray-600">{d.minutes ? fmtMin(d.minutes) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                <td className="px-1 py-2">Toplam</td>
                <td className="px-1 py-2">{t.done}/{t.planned}</td>
                <td className={`px-1 py-2 ${tone(t.compliance).text}`}>{t.compliance === null ? '—' : `%${t.compliance}`}</td>
                <td className="px-1 py-2 text-right">{t.target ? `${t.solvedForTasks} / ${t.target}` : '—'}</td>
                <td className="px-1 py-2 text-right">{t.questions}</td>
                <td className="px-1 py-2 text-right">{t.correct + t.wrong ? `${t.correct} / ${t.wrong}` : '—'}</td>
                <td className="px-1 py-2 text-right">{fmtMin(t.minutes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* Ders ders */}
      {r.subjects.length > 0 && (
        <Section title="Ders ders">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-1 py-1.5 font-semibold">Ders</th>
                  <th className="px-1 py-1.5 text-right font-semibold">Soru</th>
                  <th className="px-1 py-1.5 text-right font-semibold">Doğruluk</th>
                  <th className="px-1 py-1.5 text-right font-semibold">Program görevi</th>
                  <th className="px-1 py-1.5 text-right font-semibold">Hedef gerçekleşme</th>
                  <th className="px-1 py-1.5 text-right font-semibold">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.subjects.map((s) => {
                  const rate = s.target ? Math.round((s.solvedForTasks / s.target) * 100) : null;
                  return (
                    <tr key={s.subject}>
                      <td className="px-1 py-2 font-medium text-gray-800">{s.subject}</td>
                      <td className="px-1 py-2 text-right font-semibold text-gray-900">{s.questions || '—'}</td>
                      <td className={`px-1 py-2 text-right font-semibold ${tone(s.accuracy).text}`}>{s.accuracy === null ? '—' : `%${s.accuracy}`}</td>
                      <td className="px-1 py-2 text-right text-gray-700">{s.planned ? `${s.done}/${s.planned}` : '—'}</td>
                      <td className={`px-1 py-2 text-right ${tone(rate).text}`}>{rate === null ? '—' : `%${rate}`}</td>
                      <td className="px-1 py-2 text-right text-gray-600">{s.minutes ? fmtMin(s.minutes) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Denemeler */}
      <Section title={`Denemeler${r.exams.length ? ` (${r.exams.length})` : ''}`}>
        {r.exams.length === 0 ? <p className="text-[13px] text-gray-400">Bu dönemde deneme yok.</p> : (
          <div className="space-y-2">
            {r.exams.map((e, i) => (
              <div key={i} className="rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13.5px] font-semibold text-gray-900">{e.name}</span>
                  <span className="text-[12px] text-gray-500">{e.type} · {fmtDate(e.date, { day: 'numeric', month: 'short' })}</span>
                  <span className="ml-auto text-[15px] font-bold text-violet-700">{e.net} net</span>
                  {e.diff !== null && <span className={`text-[12px] font-semibold ${e.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{e.diff >= 0 ? '▲' : '▼'} {Math.abs(e.diff)}</span>}
                  {e.puan && <span className="text-[12px] text-gray-500">· {e.puan} puan</span>}
                </div>
                {e.subjects.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {e.subjects.map((s) => <span key={s.label} className="rounded-full bg-white px-2 py-0.5 text-[11.5px] text-gray-700 shadow-sm">{s.label}: <b>{s.net}</b></span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Konular */}
      <Section title="Konu ilerleyişi">
        <p className="mb-2 text-[13px] text-gray-600">
          Bu dönemde <b>{r.topics.progressed.length}</b> konuda ilerleme, <b className="text-emerald-600">{r.topics.completedInPeriod}</b> konu tamamlandı.
          {r.topics.total > 0 && <> Toplam: {r.topics.doneTotal}/{r.topics.total} konu tamam (%{Math.round((r.topics.doneTotal / r.topics.total) * 100)}).</>}
        </p>
        {r.topics.progressed.length > 0 && (
          <ul className="grid gap-1 sm:grid-cols-2">
            {r.topics.progressed.map((tp, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12.5px]">
                <span className="min-w-0 flex-1 truncate"><span className="text-gray-400">{tp.subject} · </span><span className="text-gray-800">{tp.topic}</span></span>
                {tp.done ? <span className="font-semibold text-emerald-600">✅ tamam</span> : <span className="text-gray-500">{tp.steps}/3 adım</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-center text-[11px] text-gray-400">
        Oluşturulma: {new Date(r.generatedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })} · Koç Defterim
      </p>
    </div>
  );
}
