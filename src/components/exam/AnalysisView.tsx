// Deneme analizi görünümü: koçun analiz penceresinde ve öğrencinin "Deneme analizim" sayfasında kullanılır.
// Sade düzen: mesaj → genel değerlendirme → ders ders çalışılacak konular (iki sütun) → hata alışkanlıkları → plan.
// audience='student' iken görüşme notlarına dayanan değerlendirme gösterilmez.

import { classifyTopics, MIN_SORU, PRIORITY_BELOW, SECOND_MAX, type DersKonulari } from '@/lib/exam-topic-priority';
import { ERROR_EMOJI } from '@/lib/exam-error-types';

export type KazanimRow = {
  ders: string; kazanim: string; soru: number; dogru: number; yanlis: number; bos: number; denemeler: string[];
  net?: number; basari?: number; kayip?: number; hata?: Record<string, number>;
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
  ders_konulari?: DersKonulari[];
  hata_ozeti?: { tur: string; etiket: string; adet: number }[];
  hata_tavsiyeleri?: string[];
  kazanim_tablosu?: {
    zayif: KazanimRow[]; guclu: KazanimRow[]; soru_verisi_olan_deneme: number;
    tum?: KazanimRow[]; dersler?: DersOzet[]; oncelik?: KazanimRow[][];
  };
};

function Card({ title, children, tone = 'border-gray-100 bg-white' }: { title?: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className={`print-avoid rounded-2xl border p-4 ${tone}`}>
      {title && <div className="mb-2.5 text-[14px] font-bold text-gray-900">{title}</div>}
      {children}
    </div>
  );
}

function TopicList({ rows, tone }: { rows: KazanimRow[]; tone: 'rose' | 'amber' }) {
  if (rows.length === 0) return <p className="text-[12px] text-gray-400">—</p>;
  const chip = tone === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800';
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => (
        <li key={i} className="flex items-start justify-between gap-2 text-[12.5px]">
          <span className="min-w-0 text-gray-800">{r.kazanim}</span>
          <span className="flex flex-shrink-0 items-center gap-1">
            <span className="text-[10.5px] text-gray-400">{r.soru} soru</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${chip}`}>%{r.basari}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AnalysisView({ a, audience = 'coach', showName = true }: { a: StudentAnalysisView; audience?: 'coach' | 'student'; showName?: boolean }) {
  const plan = a.calisma_plani?.length ? a.calisma_plani : a.oneriler ?? [];
  const table = a.kazanim_tablosu;
  // Eski kayıtlarda ders_konulari yok: aynı kurallarla tüm kazanımlardan hesaplanır
  const dersler: DersKonulari[] = a.ders_konulari ?? (table?.tum?.length ? classifyTopics(table.tum) : []);
  const hasTopics = dersler.length > 0;
  const hata = a.hata_ozeti ?? [];

  return (
    <div className="space-y-3">
      {showName && <div className="text-[16px] font-bold text-gray-900">{a.student_name}</div>}

      {a.ogrenciye_mesaj && (
        <div className="print-avoid rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-4 text-white">
          <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide opacity-80">{audience === 'student' ? 'Koçundan sana' : 'Öğrenciye mesaj'}</div>
          <p className="text-[14px] leading-relaxed">{a.ogrenciye_mesaj}</p>
        </div>
      )}

      {(a.genel_yorum || a.trend) && (
        <Card title="Genel değerlendirme">
          {a.genel_yorum && <p className="text-[13.5px] leading-relaxed text-gray-700">{a.genel_yorum}</p>}
          {a.trend && <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600"><b className="text-gray-700">Gidişat: </b>{a.trend}</p>}
        </Card>
      )}

      {hasTopics && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h3 className="text-[15px] font-bold text-gray-900">Çalışılacak konular</h3>
            <span className="text-[11px] text-gray-400">En az {MIN_SORU} soru gelen kazanımlar · %{SECOND_MAX} üstü listeye girmez</span>
          </div>
          {dersler.map((d) => (
            <div key={d.ders} className="print-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-2 bg-violet-50 px-4 py-2">
                <span className="text-[13.5px] font-bold text-violet-900">{d.ders}</span>
                {d.basari !== null && <span className="text-[12px] font-semibold text-violet-700">ders başarısı %{d.basari}</span>}
              </div>
              <div className="grid gap-3 p-3.5 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-rose-600">🔴 Öncelikli · %0–{PRIORITY_BELOW - 1}</div>
                  <TopicList rows={d.oncelikli as KazanimRow[]} tone="rose" />
                </div>
                <div className="sm:border-l sm:border-gray-100 sm:pl-3">
                  <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-amber-600">🟠 İkinci öncelik · %{PRIORITY_BELOW}–{SECOND_MAX}</div>
                  <TopicList rows={d.ikinci as KazanimRow[]} tone="amber" />
                </div>
              </div>
              {d.cikarilan.length > 0 && (
                <details className="border-t border-gray-100 px-4 py-2">
                  <summary className="cursor-pointer text-[11.5px] font-medium text-gray-500">Listeye alınmayan {d.cikarilan.length} konu (halledildi / dikkat hatası)</summary>
                  <ul className="mt-1.5 space-y-1">
                    {d.cikarilan.map((c, i) => (
                      <li key={i} className="text-[12px] text-gray-600"><b className="font-medium text-gray-700">{c.kazanim}</b> <span className="text-gray-400">%{c.basari}</span> — {c.neden}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasTopics && !!a.kazanim_oncelikleri?.length && (
        <Card title="Öncelikli konular">
          <ol className="space-y-1.5">
            {a.kazanim_oncelikleri.map((k, i) => (
              <li key={i} className="text-[13px] text-gray-700"><b className="text-gray-900">{k.kazanim}</b> <span className="text-gray-400">· {k.ders}</span>{k.oneri ? ` — ${k.oneri}` : ''}</li>
            ))}
          </ol>
        </Card>
      )}

      {(hata.length > 0 || !!a.hata_tavsiyeleri?.length) && (
        <Card title="Hata alışkanlıkları" tone="border-sky-100 bg-sky-50/40">
          {hata.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {hata.map((h) => <span key={h.tur} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-gray-700 shadow-sm">{ERROR_EMOJI[h.tur] ?? '•'} {h.etiket}: {h.adet}</span>)}
            </div>
          )}
          {!!a.hata_tavsiyeleri?.length && (
            <ul className="space-y-1">
              {a.hata_tavsiyeleri.map((t, i) => <li key={i} className="text-[13px] leading-relaxed text-gray-700">• {t}</li>)}
            </ul>
          )}
        </Card>
      )}

      {!hasTopics && !!a.ders_yorumlari?.length && (
        <Card title="Ders ders">
          <ul className="space-y-1.5">
            {a.ders_yorumlari.map((d, i) => <li key={i} className="text-[13px] leading-relaxed text-gray-700"><b className="text-gray-900">{d.ders}: </b>{d.yorum}</li>)}
          </ul>
        </Card>
      )}

      {plan.length > 0 && (
        <Card title="Çalışma planı" tone="border-blue-100 bg-blue-50/40">
          <ol className="list-inside list-decimal space-y-1">
            {plan.map((p, i) => <li key={i} className="text-[13px] leading-relaxed text-gray-700">{p}</li>)}
          </ol>
        </Card>
      )}

      {audience === 'coach' && a.capraz_degerlendirme && (
        <Card title="Görüşme notlarıyla birlikte (öğrenciye gösterilmez)" tone="border-amber-100 bg-amber-50/50">
          <p className="text-[13px] leading-relaxed text-gray-700">{a.capraz_degerlendirme}</p>
        </Card>
      )}

      {!!table?.tum?.length && (
        <details className="print-avoid rounded-2xl border border-gray-100 bg-white p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-gray-600">Tüm kazanımlar ({table.tum.length})</summary>
          <div className="mt-2 space-y-2.5">
            {Array.from(new Set(table.tum.map((r) => r.ders))).map((ders) => (
              <div key={ders}>
                <div className="mb-1 text-[12px] font-bold text-violet-800">{ders}</div>
                <ul className="space-y-0.5">
                  {table.tum!.filter((r) => r.ders === ders).map((r, i) => (
                    <li key={i} className="flex justify-between gap-2 text-[12px] text-gray-700">
                      <span className="min-w-0">{r.kazanim}</span>
                      <span className="flex-shrink-0 text-gray-500">{r.soru} soru · {r.dogru}D {r.yanlis}Y {r.bos}B · %{r.basari}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
