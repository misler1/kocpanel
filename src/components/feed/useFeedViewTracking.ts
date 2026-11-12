'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Öğrencinin paylaşılan içeriği açması ve izlemesi (supabase/feed_views.sql → record_feed_view).
// YouTube ve Vimeo oynatıcılarından postMessage ile oynatma süresi alınır (harici betik yüklenmez);
// izlenen her saniye bir kez sayılır, ileri sarılan kısım sayılmaz. Diğer sitelerde yalnızca "açtı" kaydedilir.

const SEND_EVERY_MS = 15_000;

export function useFeedViewTracking(postId: string | undefined, provider: string) {
  const supabase = useMemo(() => createClient(), []);
  const opened = useRef(false);
  const watched = useRef(new Set<number>());
  const duration = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const sentSize = useRef(0);
  const frame = useRef<HTMLIFrameElement | null>(null);

  const send = useCallback((newOpen: boolean) => {
    if (!postId) return;
    sentSize.current = watched.current.size;
    void (supabase as any).rpc('record_feed_view', {
      p_post: postId, p_watched: watched.current.size,
      p_duration: duration.current ? Math.round(duration.current) : null, p_new_open: newOpen,
    }).then(() => {}, () => {});
  }, [postId, supabase]);

  const markOpen = useCallback(() => {
    if (!postId || opened.current) return;
    opened.current = true;
    send(true);
  }, [postId, send]);

  const onTime = useCallback((t: number, d?: number) => {
    if (d && d > 0) duration.current = d;
    const cur = Math.floor(t);
    const prev = lastTime.current;
    // Kısa ilerlemeler arası doldurulur; ileri/geri sarma (3 sn'den büyük atlama) sayılmaz
    if (prev !== null && cur > prev && cur - prev <= 3) for (let s = prev + 1; s <= cur; s++) watched.current.add(s);
    else if (prev === cur) watched.current.add(cur);
    lastTime.current = cur;
  }, []);

  // Oynatıcı mesajları
  useEffect(() => {
    if (!postId || (provider !== 'youtube' && provider !== 'vimeo')) return;
    function onMessage(ev: MessageEvent) {
      if (!frame.current || ev.source !== frame.current.contentWindow) return;
      let data: any = ev.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
      if (!data || typeof data !== 'object') return;
      if (provider === 'youtube') {
        const info = data.info;
        if (info && typeof info === 'object') {
          if (typeof info.duration === 'number' && info.duration > 0) duration.current = info.duration;
          // 1 = oynatılıyor; currentTime yalnızca oynatırken sayılır
          if (typeof info.currentTime === 'number' && (info.playerState === undefined || info.playerState === 1)) onTime(info.currentTime);
          if (info.playerState === 2 || info.playerState === 0) send(false); // durdurdu / bitti
        }
      } else {
        const d = data.data;
        if ((data.event === 'timeupdate' || data.event === 'playProgress') && d && typeof d.seconds === 'number') onTime(d.seconds, d.duration);
        if (data.event === 'pause' || data.event === 'ended' || data.event === 'finish') send(false);
      }
    }
    window.addEventListener('message', onMessage);
    const timer = window.setInterval(() => { if (opened.current && watched.current.size !== sentSize.current) send(false); }, SEND_EVERY_MS);
    const flush = () => { if (opened.current && watched.current.size !== sentSize.current) send(false); };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      window.clearInterval(timer);
      flush();
    };
  }, [postId, provider, onTime, send]);

  /** iframe yüklenince oynatıcıya "olayları bana gönder" denir (oynatıcı hazır olana kadar birkaç kez) */
  const onFrameLoad = useCallback((el: HTMLIFrameElement | null) => {
    frame.current = el;
    if (!el || !postId) return;
    const hello = () => {
      const w = el.contentWindow;
      if (!w) return;
      if (provider === 'youtube') {
        w.postMessage(JSON.stringify({ event: 'listening', id: postId, channel: 'widget' }), '*');
        w.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: postId, channel: 'widget' }), '*');
      } else if (provider === 'vimeo') {
        for (const v of ['timeupdate', 'playProgress', 'pause', 'ended', 'finish']) w.postMessage(JSON.stringify({ method: 'addEventListener', value: v }), '*');
      }
    };
    hello();
    [500, 1500, 3000].forEach((ms) => window.setTimeout(hello, ms));
  }, [postId, provider]);

  return { markOpen, onFrameLoad, tracking: !!postId };
}
