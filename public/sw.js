// KoçDefterim service worker: telefon bildirimleri + bağlantı yokken gösterilen sayfa.
// Panel sayfaları kişiye özel olduğu için önbelleğe alınmaz; yalnızca çevrimdışı sayfası saklanır.
const OFFLINE_CACHE = 'kd-offline-v1';
// Bu dosya her değiştiğinde tarayıcı yeni sürümü kendisi kurar (sw.js önbelleğe alınmaz: updateViaCache 'none').
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((c) => c.addAll([OFFLINE_URL, '/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse;
      if (preloaded) return preloaded;
      return await fetch(event.request);
    } catch {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_URL)) || Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'KoçDefterim', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-badge-96.png',
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      // Uygulama zaten açık: sayfayı baştan yüklemek yerine (beyaz ekran) uygulama içinden geçiş yapılır.
      // Sayfadaki dinleyici (src/components/PwaRegister.tsx) 'open-url' mesajını alıp yönlendirir.
      client.postMessage({ type: 'open-url', url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
