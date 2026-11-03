'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// instrumentation-client.ts ile aynı ad
const NAV_START_EVENT = 'kd:nav-start';
// Önceden yüklenmiş sayfalar anında açılır; çizgi yalnızca gerçekten beklenen geçişlerde görünsün
const SHOW_DELAY_MS = 120;
// Geçiş hiç tamamlanmazsa (hata, aynı sayfaya yönlendirme) çizgi takılı kalmasın
const GIVE_UP_MS = 15_000;

/**
 * Sayfa açılırken ekranın üstünde ilerleyen ince çizgi.
 * Başlangıç: Next.js yönlendiricisi geçişe başlayınca; bitiş: adres (yol + sorgu) değişince.
 * Gerçek yükleme yüzdesi bilinemez; çizgi önce hızlı, sonra yavaşlayarak %90'a kadar ilerler, sayfa gelince dolar.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [progress, setProgress] = useState<number | null>(null); // null: gizli
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<{ show?: number; tick?: number; giveUp?: number; hide?: number }>({});
  const visible = useRef(false);

  function clearTimers() {
    const t = timers.current;
    window.clearTimeout(t.show);
    window.clearInterval(t.tick);
    window.clearTimeout(t.giveUp);
    window.clearTimeout(t.hide);
    timers.current = {};
  }

  function finish() {
    const t = timers.current;
    window.clearTimeout(t.show);
    window.clearInterval(t.tick);
    window.clearTimeout(t.giveUp);
    if (!visible.current) return; // hiç görünmediyse göstermeden bitir
    visible.current = false;
    setProgress(100);
    setFinishing(true);
    t.hide = window.setTimeout(() => { setProgress(null); setFinishing(false); }, 350);
  }

  useEffect(() => {
    const onStart = () => {
      clearTimers();
      visible.current = false;
      setProgress(null);
      setFinishing(false);
      const t = timers.current;
      t.show = window.setTimeout(() => {
        visible.current = true;
        setProgress(12);
        t.tick = window.setInterval(() => {
          // Kalan yolun küçük bir kısmı kadar ilerle: %90'a yaklaştıkça yavaşlar, hiç ulaşmaz
          setProgress((p) => (p === null ? p : p + (90 - p) * 0.08));
        }, 200);
      }, SHOW_DELAY_MS);
      t.giveUp = window.setTimeout(finish, GIVE_UP_MS);
    };
    window.addEventListener(NAV_START_EVENT, onStart);
    return () => { window.removeEventListener(NAV_START_EVENT, onStart); clearTimers(); };
  }, []);

  // Yeni sayfa geldi
  useEffect(() => {
    finish();
  }, [pathname, search]);

  if (progress === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" role="progressbar" aria-label="Sayfa yükleniyor"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] shadow-[0_0_8px_rgba(236,72,153,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: finishing ? 0 : 1,
          transition: finishing ? 'width 200ms ease-out, opacity 250ms ease 150ms' : 'width 200ms linear',
        }}
      />
    </div>
  );
}
