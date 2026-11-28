'use client';

import { useEffect, useState } from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { parseEmbed } from '@/lib/embed';

// Öğrenci detayı → Genel bakış: koçun/öğretmenlerin bu öğrenciye paylaştığı içerikler ve izlenme durumu
// (api/ogrenci-icerik-izleme). YouTube/Vimeo'da izlenen yüzde ve süre, diğer sitelerde yalnızca "açtı".

type Item = {
  id: string; url: string; title: string | null; startsAt: string; author: string | null; visible: boolean;
  view: { openedAt: string; lastAt: string; openCount: number; watched: number; duration: number | null; percent: number } | null;
};
type Data = { days: number; hasAccount: boolean; items: Item[] };

const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} dk${s % 60 ? ` ${s % 60} sn` : ''}` : `${s} sn`);
const day = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
const when = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function IcerikIzleme({ studentId }: { studentId: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/ogrenci-icerik-izleme?studentId=${studentId}&gun=${days}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) { setError(j.error ?? 'Yüklenemedi'); return; }
        setError(null); setData(j);
      })
      .catch(() => { if (alive) setError('Bağlantı hatası'); });
    return () => { alive = false; };
  }, [studentId, days]);

  const items = data?.days === days ? data.items : null;
  const opened = items?.filter((i) => i.view).length ?? 0;
  const timedViews = items?.filter((i) => i.view?.duration) ?? [];
  const avg = timedViews.length ? Math.round(timedViews.reduce((a, i) => a + (i.view!.percent ?? 0), 0) / timedViews.length) : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-0.5 text-[12px]">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 font-medium ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Son {d} gün
            </button>
          ))}
        </div>
        {items && items.length > 0 && (
          <p className="text-[13px] text-gray-700">
            <b>{items.length}</b> içerikten <b>{opened}</b>&apos;ini açtı
            {avg !== null && <span className="text-gray-500"> · videolarda ort. %{avg} izledi</span>}
          </p>
        )}
      </div>

      {error ? <p className="text-[13px] text-red-600">{error}</p>
        : !items ? <p className="text-[13px] text-gray-400">Yükleniyor…</p>
        : items.length === 0 ? (
          <p className="text-[13px] text-gray-400">Son {days} günde bu öğrenciye içerik paylaşılmadı. İçerikler ana sayfadaki &quot;İçerik paylaş&quot; bölümünden gönderilir.</p>
        ) : (
          <>
            {data && !data.hasAccount && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Öğrencinin hesabı yok; paylaşılan içerikleri göremez.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {items.map((i) => {
                const emb = parseEmbed(i.url);
                const timed = !!i.view?.duration;
                return (
                  <li key={i.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <a href={i.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[13px] font-medium text-gray-900 hover:underline">
                        <span className="truncate">{i.title || emb?.host || i.url}</span>
                        <IconExternalLink size={13} className="flex-shrink-0 text-gray-400" />
                      </a>
                      <p className="text-[11.5px] text-gray-500">
                        {day(i.startsAt)}{emb ? ` · ${emb.label}` : ''}{i.author ? ` · ${i.author}` : ''}
                        {!i.visible && <span title="Yerine daha yeni içerik paylaşıldı ya da yayından kaldırıldı; öğrencinin sayfasında artık görünmüyor."> · yayından kalktı</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-[12px] sm:w-56 sm:text-right">
                      {!i.view ? (
                        <span className="inline-flex items-center gap-1.5 text-gray-400"><span className="h-2 w-2 rounded-full bg-gray-300" /> Açmadı</span>
                      ) : timed ? (
                        <div title={`Son: ${when(i.view.lastAt)}`}>
                          <span className="text-gray-700"><b>%{i.view.percent}</b> · {dur(i.view.watched)} / {dur(i.view.duration!)}</span>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 sm:ml-auto sm:w-40">
                            <div className={`h-full ${i.view.percent >= 80 ? 'bg-emerald-500' : i.view.percent >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, i.view.percent)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Açtı{i.view.openCount > 1 ? ` (${i.view.openCount} kez)` : ''} · {when(i.view.lastAt)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-gray-400">
              YouTube ve Vimeo&apos;da izlenen süre tutulur (ileri sarılan kısım sayılmaz); diğer sitelerde yalnızca açılıp açılmadığı görünür.
            </p>
          </>
        )}
    </div>
  );
}
