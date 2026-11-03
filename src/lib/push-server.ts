/* eslint-disable @typescript-eslint/no-explicit-any */
// SADECE sunucu tarafında kullanın (service_role ve gizli anahtarlar). supabase/push_notifications.sql ile birlikte çalışır.
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_URL } from '@/lib/site';

type VapidKeys = { publicKey: string; privateKey: string };

let cachedKeys: VapidKeys | null = null;

async function readSettings(keys: string[]) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin.from('app_settings').select('key, value').in('key', keys);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value as string])) as Record<string, string>;
}

/** VAPID anahtarları: ilk kullanımda üretilir ve veritabanında saklanır (her sunucu örneği aynı anahtarı kullanır). */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (cachedKeys) return cachedKeys;
  let s = await readSettings(['vapid_public', 'vapid_private']);
  if (!s.vapid_public || !s.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    const admin = createAdminClient() as any;
    // Aynı anda iki istek üretirse ilk yazılan kalır (ignoreDuplicates), ardından tekrar okunur.
    await admin.from('app_settings').upsert(
      [{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }],
      { onConflict: 'key', ignoreDuplicates: true },
    );
    s = await readSettings(['vapid_public', 'vapid_private']);
  }
  cachedKeys = { publicKey: s.vapid_public, privateKey: s.vapid_private };
  return cachedKeys;
}

export async function getPushSecret() {
  return (await readSettings(['push_secret'])).push_secret ?? null;
}

export type PushPayload = { title: string; body?: string | null; url?: string | null; tag?: string };

/** Kullanıcının tüm cihazlarına gönderir; süresi dolmuş abonelikleri temizler. Gönderilen cihaz sayısını döner. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const admin = createAdminClient() as any;
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
  if (!subs?.length) return 0;

  const keys = await getVapidKeys();
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(subs.map((s: any) =>
    webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      body,
      {
        TTL: 60 * 60 * 24,
        urgency: 'high',
        vapidDetails: { subject: SITE_URL, publicKey: keys.publicKey, privateKey: keys.privateKey },
      },
    ),
  ));

  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = (r.reason as any)?.statusCode;
      // 404/410: cihaz aboneliği iptal edilmiş (uygulama silindi, izin kaldırıldı)
      if (code === 404 || code === 410) gone.push(subs[i].id);
      else console.error('push gönderilemedi', code, (r.reason as any)?.body ?? r.reason);
    }
  });
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);
  return results.filter((r) => r.status === 'fulfilled').length;
}
