/* eslint-disable @typescript-eslint/no-explicit-any */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPushSecret, sendPushToUser } from '@/lib/push-server';

// Veritabanı tetikleyicisi (supabase/push_notifications.sql → _push_notification) yeni bildirimde burayı çağırır.
// Oturum yoktur; istek app_settings'teki ortak parolayla doğrulanır. Gövdede yalnızca bildirim kimliği gelir,
// başlık/metin/alıcı veritabanından okunur.

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const secret = await getPushSecret().catch(() => null); // push_notifications.sql çalıştırılmamışsa tablo yok
  const given = request.headers.get('x-push-secret') ?? '';
  if (!secret || !sameSecret(given, secret)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });

  const admin = createAdminClient() as any;
  const { data: n } = await admin.from('notifications')
    .select('id, recipient_id, kind, title, body, link, read_at, created_at').eq('id', id).maybeSingle();
  // Okunmuş ya da eskimiş bildirim telefona gönderilmez
  if (!n || n.read_at || Date.now() - new Date(n.created_at).getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ sent: 0 });
  }

  const sent = await sendPushToUser(n.recipient_id, {
    title: n.title,
    body: n.body,
    url: n.link || '/',
    // Aynı sohbetten gelen mesajlar telefonda tek bildirimde güncellenir
    tag: n.kind === 'mesaj' ? `mesaj:${n.link ?? ''}` : n.id,
  });
  return NextResponse.json({ sent });
}
