// Uygulama etkileşimli olmadan önce tarayıcıda çalışır (Next.js instrumentation-client).
// Her sayfa geçişinin başlangıcını sayfanın üstündeki ilerleme çizgisine bildirir (src/components/NavigationProgress.tsx).

const NAV_START_EVENT = 'kd:nav-start';

export function onRouterTransitionStart(url: string) {
  try {
    const next = new URL(url, window.location.href);
    // Aynı adrese (ya da yalnızca #bölüm değişikliğine) geçişte çizgi gösterilmez
    if (next.pathname === window.location.pathname && next.search === window.location.search) return;
    window.dispatchEvent(new CustomEvent(NAV_START_EVENT));
  } catch {
    // ilerleme çizgisi gezinmeyi asla engellememeli
  }
}
