'use client';

import { useState } from 'react';
import { IconBrandYoutube, IconBrandInstagram, IconBrandX, IconBrandTiktok, IconBrandVimeo, IconBrandSpotify, IconExternalLink, IconPlayerPlayFilled, IconLink } from '@tabler/icons-react';
import { parseEmbed, type Embed } from '@/lib/embed';
import { useFeedViewTracking } from './useFeedViewTracking';

const ICONS: Record<Embed['provider'], typeof IconLink> = {
  youtube: IconBrandYoutube, instagram: IconBrandInstagram, x: IconBrandX, tiktok: IconBrandTiktok,
  vimeo: IconBrandVimeo, spotify: IconBrandSpotify, link: IconLink,
};

const TINT: Record<Embed['provider'], string> = {
  youtube: 'from-red-500 to-rose-600', instagram: 'from-fuchsia-500 via-pink-500 to-amber-400', x: 'from-zinc-800 to-zinc-950',
  tiktok: 'from-zinc-900 to-cyan-700', vimeo: 'from-sky-500 to-cyan-600', spotify: 'from-emerald-500 to-green-700', link: 'from-indigo-500 to-violet-600',
};

/**
 * Paylaşılan bağlantının görünümü. Oynatıcı ilk dokunuşta yüklenir (ana sayfa hızlı açılsın, mobil veri harcanmasın).
 * Bilinmeyen siteler yeni sekmede açılan bağlantı kartı olur.
 * trackPostId verilirse (öğrenci ana sayfası) açma ve izleme süresi kaydedilir (feed_views.sql).
 */
export function EmbedView({ url, title, compact = false, trackPostId }: { url: string; title?: string | null; compact?: boolean; trackPostId?: string }) {
  const [play, setPlay] = useState(false);
  const e = parseEmbed(url);
  const track = useFeedViewTracking(trackPostId, e?.provider ?? 'link');
  if (!e) return null;
  const Icon = ICONS[e.provider];

  if (!e.src) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={track.markOpen}
        className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-3 transition-colors hover:bg-[var(--accent-soft)]">
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${TINT.link} text-white`}><Icon size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-[var(--ink)]">{title || e.host}</span>
          <span className="block truncate text-[12px] text-[var(--ink-muted)]">{e.host}</span>
        </span>
        <IconExternalLink size={18} className="flex-shrink-0 text-[var(--ink-muted)]" />
      </a>
    );
  }

  const ytId = e.provider === 'youtube' ? e.src.match(/embed\/([A-Za-z0-9_-]+)/)?.[1] : null;
  const vertical = e.aspect === '9 / 16';
  const boxStyle = e.aspect ? { aspectRatio: e.aspect } : { height: compact ? Math.min(e.height ?? 400, 420) : e.height };
  // Oynatıcı olaylarını dinleyebilmek için YouTube'a JS API izni (yalnızca izleme açıkken)
  const apiParams = track.tracking && e.provider === 'youtube' && typeof window !== 'undefined'
    ? `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}` : '';
  const boxCls = `relative w-full overflow-hidden rounded-2xl bg-black/5 ${vertical || e.height && e.height > 300 ? 'mx-auto max-w-[400px]' : ''}`;

  return (
    <div>
      <div className={boxCls} style={boxStyle}>
        {play ? (
          <iframe
            ref={track.tracking ? track.onFrameLoad : undefined}
            onLoad={track.tracking ? (ev) => track.onFrameLoad(ev.currentTarget) : undefined}
            src={`${e.src}${e.provider === 'youtube' ? `&autoplay=1${apiParams}` : ''}`}
            title={title || e.label}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-popups-to-escape-sandbox"
          />
        ) : (
          <button type="button" onClick={() => { setPlay(true); track.markOpen(); }} aria-label={`${e.label} içeriğini aç`}
            className={`group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${TINT[e.provider]} text-white`}>
            {ytId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition-transform group-hover:scale-105">
              <IconPlayerPlayFilled size={26} />
            </span>
            {!ytId && <span className="relative flex items-center gap-1.5 text-[13px] font-bold"><Icon size={18} /> {e.label} içeriğini aç</span>}
          </button>
        )}
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={track.markOpen}
        className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">
        <Icon size={14} /> {e.label} · yeni sekmede aç <IconExternalLink size={12} />
      </a>
    </div>
  );
}
