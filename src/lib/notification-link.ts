// Bildirime tıklanınca gidilecek adres. Veritabanındaki bağlantı ('/ogrenci') öğrenci ana sayfasıdır;
// içerik ve duyuru bildirimleri sayfadaki ilgili bölüme (StudentFeed: #icerik, #pano) kaydırır.
export function notificationHref(kind: string, link: string | null): string | null {
  if (link === '/ogrenci' && kind === 'icerik') return '/ogrenci#icerik';
  if (link === '/ogrenci' && kind === 'duyuru') return '/ogrenci#pano';
  return link;
}

/** Aynı sayfadaysa (yalnızca #bölüm farklı) yönlendirmeden o bölüme kaydırır; değilse yönlendirir. */
export function openInApp(push: (href: string) => void, href: string) {
  const url = new URL(href, window.location.origin);
  if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) {
    const el = document.getElementById(url.hash.slice(1));
    if (el) {
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  push(url.pathname + url.search + url.hash);
}

/** Sayfa #bölüm ile açıldıysa o bölüme kaydırır (bileşen yüklendiğinde çağrılır). */
export function scrollToHashIf(id: string) {
  if (typeof window === 'undefined' || window.location.hash !== `#${id}`) return;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
