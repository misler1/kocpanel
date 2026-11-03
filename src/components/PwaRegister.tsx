'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push-client';

/** Service worker'ı kaydeder (telefon bildirimleri ve çevrimdışı sayfa için). Geliştirme ortamında kaydedilmez. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') registerServiceWorker();
  }, []);
  return null;
}
