'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerServiceWorker } from '@/lib/push-client';

/**
 * Service worker'ı kaydeder (telefon bildirimleri ve çevrimdışı sayfa için; geliştirme ortamında kaydedilmez).
 * Uygulama açıkken telefon bildirimine dokunulursa service worker 'open-url' gönderir; sayfa yeniden yüklenmeden geçilir.
 */
export function PwaRegister() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') registerServiceWorker();
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'open-url' || typeof e.data.url !== 'string') return;
      const url = new URL(e.data.url, window.location.origin);
      if (url.origin !== window.location.origin) return;
      router.push(url.pathname + url.search);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
