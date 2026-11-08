// Deneme analizi görünümü: koçun analiz penceresinde ve öğrencinin "Deneme analizim" sayfasında kullanılır.
// audience='student' iken görüşme notlarına dayanan değerlendirme gösterilmez.

export type KazanimRow = {
  ders: string; kazanim: string; soru: number; dogru: number; yanlis: number; bos: number; denemeler: string[];
  net?: number; basari?: number; kayip?: number;
};
type DersOzet = { ders: string; soru: number; dogru: number; yanlis: number; bos: number; net: number; basari: number };

export type StudentAnalysisView = {
  student_name: string;
  genel_yorum?: string;
  trend?: string;
  guclu_dersler?: string[];
  zayif_dersler?: string[];
  ders_yorumlari?: { ders: string; yorum: string }[];
  kazanim_oncelikleri?: { ders: string; kazanim: string; durum: string; oneri: string }[];
  guclu_kazanimlar?: { ders: string; kazanim: string }[];
  calisma_plani?: string[];
  oneriler?: string[];
  ogrenciye_mesaj?: string;
  capraz_degerlendirme?: string | null;
  kazanim_tablosu?: {
    zayif: KazanimRow[]; guclu: KazanimRow[]; soru_verisi_olan_deneme: number;
    tum?: KazanimRow[]; dersler?: DersOzet[]; oncelik?: KazanimRow[][];
  };
};

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`print-avoid rounded-xl border p-3.5 ${tone}`}>
      <div className="mb-2 text-[13.5px] font-bold">{title}</div>
      {children}
    </div>
  );
}

/** Başarı yüzdesine göre renk (PDF'teki gibi: kırmızı < 50, sarı < 80, yeşil) */
const badge = (b: number) =>
  b >= 80 ? 'bg-emerald-100 text-emerald-800' : b >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700';
const bar = (b: number) => (b >= 80 ? 'bg-emerald-400' : b >= 50 ? 'bg-amber-400' : 'bg-rose-400');
const fmtN = (n: number | undefined) => (n ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });

function KazanimTable({ rows, showDers = true }: { rows: KazanimRow[]; showDers?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[12.5px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
            {showDers && <th className="py-1 pr-2 font-semibold">Ders</th>}
            <th className="py-1 pr-2 font-semibold">Konu / kazanım</th>
            <th className="px-1 text-right font-semibold">Soru</th>
            <th className="px-1 text-right font-semibold">D</th>
            <th className="px-1 text-right font-semibold">Y</th>
            <th className="px-1 text-right font-semibold">B</th>
            <th className="px-1 text-right font-semibold">Net</th>
            <th className="pl-1 text-right font-semibold">Başarı</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {showDers && <td className="whitespace-nowrap py-1 pr-2 text-gray-500">{r.ders}</td>}
              <td className="py-1 pr-2 text-gray-800">{r.kazanim}</td>
              <td className="px-1 text-right text-gray-600">{r.soru}</td>
              <td className="px-1 text-right text-gray-600">{r.dogru || '-'}</td>
              <td className="px-1 text-right text-gray-600">{r.yanlis || '-'}</td>
              <td className="px-1 text-right text-gray-600">{r.bos || '-'}</td>
              <td className="px-1 text-right text-gray-700">{fmtN(r.net)}</td>
              <td className="pl-1 text-right">
                {r.basari !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${badge(r.basari)}`}>%{r.basari}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalysisView({ a, audience = 'coach', showName = true }: { a: StudentAnalysisView; audience?: 'coach' | 'student'; showName?: boolean }) {
  const plan = a.calisma_plani?.length ? a.calisma_plani : a.oneriler ?? [];
  const table = a.kazanim_tablosu;
  const weak = table?.zayif ?? [];
  const maxMiss = Math.max(1, ...weak.map((r) => r.yanlis + r.bos));

  return (
    <div className="space-y-3">
      {showName && <div className="text-[16px] font-bold text-gray-900">{a.student_name}</div>}

      {a.ogrenciye_mesaj && (
        <div className="print-avoid rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-3.5 text-white">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide opacity-80">{audience === 'student' ? 'Koçundan sana' : 'Öğrenciye mesaj'}</div>
          <p className="text-[14px] leading-relaxed">{a.ogrenciye_mesaj}</p>
        </div>
      )}

      {(a.genel_yorum || a.trend) && (
        <Section title="Genel değerlendirme" tone="border-gray-100 bg-white text-gray-800">
          {a.genel_yorum && <p className="text-[13.5px] leading-relaxed text-gray-700">{a.genel_yorum}</p>}
          {a.trend && <p className="mt-2 text-[13px] leading-relaxed text-gray-600"><b className="text-gray-700">Gidişat: </b>{a.trend}</p>}
          {(a.guclu_dersler?.length || a.zayif_dersler?.length) ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {a.guclu_dersler?.map((d) => <span key={`g${d}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">+ {d}</span>)}
              {a.zayif_dersler?.map((d) => <span key={`z${d}`} className="rounded-full bg-rose-50 px-2.5 py-1 text-[12px] font-medium text-rose-600">− {d}</span>)}
            </div>
          ) : null}
        </Section>
      )}

      {!!a.kazanim_oncelikleri?.length && (
        <Section title="Yorumlu öncelikler" tone="border-rose-100 bg-rose-50/40 text-rose-900">
          <ol className="space-y-2">
            {a.kazanim_oncelikleri.map((k, i) => (
              <li key={i} className="rounded-lg bg-white p-2.5 text-[13px] shadow-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-gray-900">{i + 1}. {k.kazanim}</span>
                  <span className="text-[11.5px] font-semibold text-rose-600">{k.ders}</span>
                </div>
                {k.durum && <div className="text-[12px] text-gray-500">{k.durum}</div>}
                {k.oneri && <div className="mt-1 text-gray-700">→ {k.oneri}</div>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {!!table?.dersler?.length && (
        <Section title={`Ders başarıları (${table.soru_verisi_olan_deneme} denemenin soru verisinden)`} tone="border-gray-100 bg-white text-gray-800">
          <div className="space-y-1.5">
            {table.dersler.map((d) => (
              <div key={d.ders} className="text-[12.5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-gray-800">{d.ders}</span>
                  <span className="text-[11.5px] text-gray-500">{d.soru} soru · {d.dogru}D {d.yanlis}Y {d.bos}B · <b className="text-gray-700">%{d.basari}</b></span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${bar(d.basari)}`} style={{ width: `${Math.max(0, Math.min(100, d.basari))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {table?.oncelik?.length ? (
        <Section title="Öncelikli konu listesi (en çok net kaybettirenler)" tone="border-rose-100 bg-white text-gray-800">
          <div className="space-y-3">
            {table.oncelik.map((tier, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between rounded-lg bg-rose-50 px-2.5 py-1 text-[12.5px] font-bold text-rose-800">
                  <span>{i + 1}. öncelik · {tier.length} konu</span>
                  <span className="font-semibold">kayıp {fmtN(tier.reduce((t, r) => t + (r.kayip ?? 0), 0))} net</span>
                </div>
                <KazanimTable rows={tier} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {weak.length > 0 && !table?.oncelik?.length && (
        <Section title={`Ortak kazanım tablosu (${table?.soru_verisi_olan_deneme ?? 0} denemenin soru verisinden)`} tone="border-gray-100 bg-white text-gray-800">
          <div className="space-y-1.5">
            {weak.slice(0, 15).map((r, i) => (
              <div key={i} className="text-[12.5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-gray-800" title={r.kazanim}><span className="text-gray-400">{r.ders} · </span>{r.kazanim}</span>
                  <span className="flex-shrink-0 text-[11.5px] text-gray-500">{r.soru} soru · {r.dogru}D {r.yanlis}Y {r.bos}B</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${((r.yanlis + r.bos) / maxMiss) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(!!a.guclu_kazanimlar?.length || !!table?.guclu.length) && (
        <Section title="Sağlam kazanımlar" tone="border-emerald-100 bg-emerald-50/40 text-emerald-900">
          <div className="flex flex-wrap gap-1.5">
            {(a.guclu_kazanimlar?.length ? a.guclu_kazanimlar : table!.guclu.map((r) => ({ ders: r.ders, kazanim: r.kazanim }))).slice(0, 10).map((k, i) => (
              <span key={i} className="rounded-full bg-white px-2.5 py-1 text-[12px] text-emerald-800 shadow-sm">✓ {k.kazanim} <span className="text-emerald-600/70">· {k.ders}</span></span>
            ))}
          </div>
        </Section>
      )}

      {!!a.ders_yorumlari?.length && (
        <Section title="Ders ders" tone="border-gray-100 bg-white text-gray-800">
          <ul className="space-y-1.5">
            {a.ders_yorumlari.map((d, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-gray-700"><b className="text-gray-900">{d.ders}: </b>{d.yorum}</li>
            ))}
          </ul>
        </Section>
      )}

      {!!table?.tum?.length && (
        <details className="print-avoid rounded-xl border border-gray-100 bg-white p-3.5">
          <summary className="cursor-pointer text-[13.5px] font-bold text-gray-800">Konu başarı analizi (tüm kazanımlar · {table.tum.length})</summary>
          <div className="mt-2 space-y-3">
            {Array.from(new Set(table.tum.map((r) => r.ders))).map((ders) => (
              <div key={ders}>
                <div className="mb-1 rounded-lg bg-violet-50 px-2.5 py-1 text-[12.5px] font-bold text-violet-800">{ders}</div>
                <KazanimTable rows={table.tum!.filter((r) => r.ders === ders)} showDers={false} />
              </div>
            ))}
          </div>
        </details>
      )}

      {plan.length > 0 && (
        <Section title="Çalışma planı" tone="border-blue-100 bg-blue-50/40 text-blue-900">
          <ol className="list-inside list-decimal space-y-1">
            {plan.map((p, i) => <li key={i} className="text-[13px] leading-relaxed text-gray-700">{p}</li>)}
          </ol>
        </Section>
      )}

      {audience === 'coach' && a.capraz_degerlendirme && (
        <Section title="Görüşme notlarıyla birlikte (öğrenciye gösterilmez)" tone="border-amber-100 bg-amber-50/50 text-amber-900">
          <p className="text-[13px] leading-relaxed text-gray-700">{a.capraz_degerlendirme}</p>
        </Section>
      )}
    </div>
  );
}
