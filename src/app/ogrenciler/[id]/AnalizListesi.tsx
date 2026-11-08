import Link from 'next/link';
import { IconSparkles } from '@tabler/icons-react';

// Öğrenci detayı > Denemeler: bu öğrenci için yapılan yapay zekâ analizleri (her analiz otomatik kaydedilir)
export type AnalizOzet = { id: string; exam_names: string[] | null; created_at: string; shared_at: string | null };

export const fmtTarihSaat = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

export function AnalizListesi({ studentId, items }: { studentId: string; items: AnalizOzet[] }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-gray-900">
        <IconSparkles size={16} className="text-violet-600" /> Deneme analizleri
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-gray-400">
          Henüz analiz yok. Deneme sonuçları sayfasında denemeleri seçip “Analiz” → “Yapay zeka ile analiz et” dediğinizde burada tarihiyle birlikte saklanır.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/ogrenciler/${studentId}/analiz/${a.id}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-900">{fmtTarihSaat(a.created_at)}</div>
                  <div className="truncate text-[12px] text-gray-500">
                    {(a.exam_names ?? []).length} deneme · {(a.exam_names ?? []).join(', ')}
                  </div>
                </div>
                {a.shared_at
                  ? <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Öğrenciye gönderildi</span>
                  : <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">Gönderilmedi</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
