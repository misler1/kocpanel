// Tarayıcı tarafı: service worker kaydı ve telefon bildirimi aboneliği (sunucu tarafı: src/lib/push-server.ts).

export type PushState =
  | 'loading'
  | 'unsupported' // tarayıcı desteklemiyor
  | 'ios-install' // iPhone/iPad: bildirim yalnızca ana ekrana eklenmiş uygulamada çalışır
  | 'denied' // kullanıcı izni reddetmiş; yalnızca cihaz ayarlarından açılabilir
  | 'off'
  | 'on';

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ kendini Mac olarak tanıtır; dokunmatik ekran ile ayırt edilir
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(undefined);
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

function base64ToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const DEVICE_KEY = 'kd-push-device';

/**
 * Bu tarayıcının kalıcı kimliği: telefon zamanla yeni bildirim adresi alabildiği için sunucu aynı cihazın
 * eski adreslerini bununla tanıyıp siler (yoksa eski adres önceki hesabın bildirimlerini getirmeye devam eder).
 */
function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return undefined; // depolama kapalıysa eski davranış (yalnızca adresle)
  }
}

async function saveOnServer(sub: PushSubscription) {
  const res = await fetch('/api/push/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), deviceId: getDeviceId() }),
  });
  if (!res.ok) throw new Error('Abonelik kaydedilemedi');
}

/** İzin ister ve bu cihazı bildirimlere abone eder. Bir dokunuşla (kullanıcı hareketiyle) çağrılmalı. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch('/api/push/subscription');
    if (!res.ok) throw new Error('Bildirim anahtarı alınamadı');
    const { publicKey } = await res.json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
  }
  await saveOnServer(sub);
  return 'on';
}

/** Bu cihazda bildirimleri kapatır */
export async function disablePush(): Promise<PushState> {
  const sub = pushSupported() ? await currentSubscription() : null;
  await fetch('/api/push/subscription', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub?.endpoint, deviceId: getDeviceId() }),
  }).catch(() => undefined);
  if (sub) await sub.unsubscribe().catch(() => undefined);
  return getPushState();
}

/** Açık aboneliği sunucuda tazeler (cihazda başka hesapla giriş yapıldıysa aboneliği bu hesaba geçirir). */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await saveOnServer(sub).catch(() => undefined);
}

/**
 * Çıkışta (oturum kapanmadan önce) çağrılır: bu cihaz sunucuda hesaptan ayrılır, o hesabın bildirimleri artık gelmez.
 * Tarayıcıdaki izin ve abonelik korunur; tekrar giriş yapılınca syncPush cihazı giriş yapan hesaba yeniden bağlar.
 */
export async function forgetPushOnThisDevice() {
  try {
    const sub = pushSupported() ? await currentSubscription() : null;
    const deviceId = getDeviceId();
    // Abonelik şu an görünmese de cihazın eski kayıtları silinsin
    if (!sub && !deviceId) return;
    await fetch('/api/push/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub?.endpoint, deviceId }),
    });
  } catch {
    // çıkış engellenmemeli
  }
}
