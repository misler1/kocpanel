/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVapidKeys } from '@/lib/push-server';

// Bu cihazın telefon bildirimi aboneliği. Giriş yapmış kullanıcıya bağlanır; aynı cihazda başka hesapla
// giriş yapılırsa abonelik o hesaba geçer (endpoint tekil).
// Tarayıcı ayrıca kalıcı bir cihaz kimliği (deviceId) gönderir: telefon yeni bildirim adresi alınca aynı cihazın
// eski adresleri silinir; çıkışta cihazın bütün kayıtları silinir (eski adres önceki hesabın bildirimlerini getirmesin).
// device_id sütunu supabase/push_device_id.sql ile eklenir; sütun yoksa eski davranışla devam edilir.

function readDeviceId(v: unknown) {
  return typeof v === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(v) ? v : null;
}

function missingColumn(error: any) {
  return error?.code === '42703' || error?.code === 'PGRST204';
}

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Tarayıcının abone olurken kullanacağı genel anahtar */
export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sub = body?.subscription;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint.startsWith('https://') || endpoint.length > 1000 || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'Geçersiz abonelik' }, { status: 400 });
  }

  const deviceId = readDeviceId(body?.deviceId);

  const admin = createAdminClient() as any;
  const row = {
    user_id: user.id,
    endpoint,
    p256dh: p256dh.slice(0, 200),
    auth: auth.slice(0, 100),
    user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300),
    last_seen_at: new Date().toISOString(),
  };
  let { error } = await admin.from('push_subscriptions').upsert(deviceId ? { ...row, device_id: deviceId } : row, { onConflict: 'endpoint' });
  if (error && deviceId && missingColumn(error)) {
    ({ error } = await admin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' }));
  } else if (!error && deviceId) {
    // Aynı cihazın eski bildirim adresleri (hangi hesaba bağlı olursa olsun) artık geçersiz
    await admin.from('push_subscriptions').delete().eq('device_id', deviceId).neq('endpoint', endpoint);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const deviceId = readDeviceId(body?.deviceId);
  if (!endpoint && !deviceId) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });

  const admin = createAdminClient() as any;
  if (endpoint) await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  // Çıkış: bu cihazın bu hesaba bağlı bütün kayıtları (eski bildirim adresleri dahil)
  if (deviceId) await admin.from('push_subscriptions').delete().eq('device_id', deviceId).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
