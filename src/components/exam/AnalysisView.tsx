// Deneme analizi görünümü: koçun analiz penceresinde ve öğrencinin "Deneme analizim" sayfasında kullanılır.
// audience='student' iken görüşme notlarına dayanan değerlendirme gösterilmez.

export type KazanimRow = { ders: string; kazanim: string; soru: number; dogru: number; yanlis: number; bos: number; denemeler: string[] };

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
  kazanim_tablosu?: { zayif: KazanimRow[]; guclu: KazanimRow[]; soru_verisi_olan_deneme: number };
};

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`print-avoid rounded-xl border p-3.5 ${tone}`}>
      <div className="mb-2 text-[13.5px] font-bold">{title}</div>
      {children}
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
        <Section title="Öncelikli kazanımlar" tone="border-rose-100 bg-rose-50/40 text-rose-900">
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

      {weak.length > 0 && (
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
