import Image from 'next/image';
import type { StudentReport } from '@/lib/student-report';
import { PrintButton } from './PrintButton';

const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const day = (d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { ...opts, timeZone: 'UTC' });
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const TRACK: Record<string, string> = {
  YKS_SAY: 'YKS Sayısal', YKS_EA: 'YKS Eşit Ağırlık', YKS_SOZ: 'YKS Sözel', YKS_DIL: 'YKS Dil', LGS: 'LGS', DIGER: '',
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-tight text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-gray-500">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-[14px] font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

/** Veliye gösterilen gelişim raporu. Yazdırılınca (PDF olarak kaydet) aynı düzen korunur. */
export function StudentReportView({ report, note, actions }: { report: StudentReport; note?: string | null; actions?: React.ReactNode }) {
  const r = report;
  const weekPct = pct(r.week.done, r.week.total);
  const maxDay = Math.max(1, ...r.last14.map((d) => d.questions));
  const answered = r.last7.correct + r.last7.wrong;
  const subtitle = [r.student.kurum, r.student.sinif, TRACK[r.student.track ?? ''] || null].filter(Boolean).join(' · ');

  return (
    <div className="report-root mx-auto max-w-3xl space-y-4 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        {actions}
        <PrintButton />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={180} height={52} className="mb-3 h-10 w-auto" priority />
          <h1 className="text-[20px] font-semibold text-gray-900">{r.student.full_name}</h1>
          {subtitle && <p className="text-[13px] text-gray-500">{subtitle}</p>}
        </div>
        <div className="text-right text-[12.5px] text-gray-500">
          <div className="font-medium text-gray-900">Öğrenci Gelişim Raporu</div>
          {r.week.start && <div>Program haftası: {day(r.week.start)}{r.week.end ? ` – ${day(r.week.end)}` : ''}</div>}
          {r.coachName && <div>Koç: {r.coachName}</div>}
          <div>Oluşturulma: {new Date(r.generatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })}</div>
        </div>
      </header>

      {note && (
        <section className="break-inside-avoid rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-blue-900">Koçun notu</h2>
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-blue-900">{note}</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Haftalık program" value={r.week.total ? `%${weekPct}` : '–'} sub={r.week.total ? `${r.week.done}/${r.week.total} görev tamamlandı` : 'Bu hafta program yok'} />
        <Kpi label="Son 7 gün" value={`${fmt(r.last7.questions)} soru`} sub={`${r.last7.activeDays}/7 gün çalıştı`} />
        <Kpi label="Çalışma serisi" value={`${r.streak.current} gün`} sub={`En uzun: ${r.streak.best} gün`} />
        <Kpi label="Konu ilerlemesi" value={r.topics.total ? `%${pct(r.topics.done, r.topics.total)}` : '–'} sub={r.topics.total ? `${r.topics.done}/${r.topics.total} konu tamam` : 'Konu takibi yok'} />
      </div>

      <Section title="Son 14 gün çözülen soru">
        <div className="flex h-36 items-end gap-1.5">
          {r.last14.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-gray-500">{d.questions || ''}</span>
              <div className="w-full rounded-t bg-blue-500" style={{ height: `${(d.questions / maxDay) * 100}%`, minHeight: d.questions ? 3 : 0 }} />
              <span className="text-[10px] text-gray-400">{day(d.date, { day: 'numeric' })}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-gray-600">
          Son 7 günde {fmt(r.last7.questions)} soru
          {answered > 0 && <> · {fmt(r.last7.correct)} doğru, {fmt(r.last7.wrong)} yanlış (başarı %{pct(r.last7.correct, answered)})</>}
          {r.last7.minutes > 0 && <> · {fmt(Math.round(r.last7.minutes / 6) / 10)} saat konu çalışması</>}
          . Toplam kayıtlı: {fmt(r.totalQuestions)} soru.
        </p>
      </Section>

      {r.week.subjects.length > 0 && (
        <Section title="Bu haftanın programı (ders bazında)">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11.5px] uppercase tracking-wide text-gray-500">
                <th className="py-1.5 font-medium">Ders</th>
                <th className="py-1.5 text-right font-medium">Görev</th>
                <th className="py-1.5 text-right font-medium">Hedef soru</th>
                <th className="py-1.5 text-right font-medium">Çözülen</th>
              </tr>
            </thead>
            <tbody>
              {r.week.subjects.map((s) => (
                <tr key={s.subject} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 text-gray-900">{s.subject}</td>
                  <td className="py-1.5 text-right text-gray-700">{s.done}/{s.tasks}</td>
                  <td className="py-1.5 text-right text-gray-700">{s.target ? fmt(s.target) : '–'}</td>
                  <td className={`py-1.5 text-right font-medium ${s.target && s.solved >= s.target ? 'text-green-700' : 'text-gray-900'}`}>{s.solved ? fmt(s.solved) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Deneme sonuçları">
        {r.targets.some((t) => t.target || t.current !== null) && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {r.targets.map((t) => (
              <div key={t.type} className="rounded-lg bg-gray-50 px-3 py-2 text-[12.5px] text-gray-700">
                <span className="font-semibold text-gray-900">{t.type}</span>
                {t.current !== null ? ` · son: ${fmt(t.current)} net` : ' · henüz deneme yok'}
                {t.best !== null && ` · en iyi: ${fmt(t.best)}`}
                {t.target ? ` · hedef: ${fmt(t.target)}` : ''}
              </div>
            ))}
          </div>
        )}
        {r.exams.length === 0 ? (
          <p className="text-[13px] text-gray-500">Henüz deneme sonucu girilmemiş.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11.5px] uppercase tracking-wide text-gray-500">
                <th className="py-1.5 font-medium">Tarih</th>
                <th className="py-1.5 font-medium">Deneme</th>
                <th className="py-1.5 font-medium">Tür</th>
                <th className="py-1.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {r.exams.map((e, i) => {
                const prev = r.exams.slice(i + 1).find((x) => x.type === e.type);
                const diff = prev ? e.net - prev.net : null;
                return (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 text-gray-600">{e.date ? day(e.date, { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</td>
                    <td className="py-1.5 text-gray-900">{e.name}</td>
                    <td className="py-1.5 text-gray-600">{e.type}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">
                      {fmt(e.net)}
                      {diff !== null && diff !== 0 && (
                        <span className={`ml-1.5 text-[11.5px] ${diff > 0 ? 'text-green-700' : 'text-red-600'}`}>{diff > 0 ? '▲' : '▼'}{fmt(Math.abs(diff))}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <footer className="pb-4 text-center text-[11.5px] text-gray-400">
        Bu rapor KoçDefterim tarafından öğrencinin kayıtlı çalışma ve deneme verilerinden otomatik oluşturulmuştur. · kocdefterim.com.tr
      </footer>
    </div>
  );
}
