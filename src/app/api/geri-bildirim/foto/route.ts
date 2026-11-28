/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// "Bize bildir" fotoğrafları (supabase/geri_bildirim_foto.sql). Depo herkese kapalı; erişim yalnızca bu adresten:
// herkes kendi klasörüne yükler/siler; açmak için fotoğrafın sahibi ya da yönetici olmak gerekir.
// Yol biçimi: <kullanıcı id>/<rastgele id>.<uzantı>

const BUCKET = 'geri-bildirim-fotolari';
const PATH_RE = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { id: user.id, isAdmin: !!data?.is_admin };
}

export async function POST(req: Request) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Yalnızca fotoğraf yüklenebilir (JPG, PNG).' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Fotoğraf çok büyük (en fazla 10 MB).' }, { status: 400 });
  const path = `${u.id}/${randomUUID()}.${ext}`;
  const { error } = await createAdminClient().storage.from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    const missing = /bucket not found/i.test(error.message);
    return NextResponse.json({ error: missing ? 'Fotoğraf deposu henüz kurulmadı (geri_bildirim_foto.sql).' : `Fotoğraf yüklenemedi: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path });
}

/** Fotoğrafı açar (sahibi ya da yönetici): 10 dakikalık bağlantıya yönlendirir */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  const m = PATH_RE.exec(path);
  const u = await me();
  if (!m || !u || (m[1] !== u.id && !u.isAdmin)) return new NextResponse('Bulunamadı', { status: 404 });
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return new NextResponse('Bulunamadı', { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, max-age=300' } });
}

/** Gönderilmeden kaldırılan fotoğraf (yalnızca kendi klasörü) ya da yöneticinin sildiği bildirimin fotoğrafı */
export async function DELETE(req: Request) {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  const m = PATH_RE.exec(path);
  const u = await me();
  if (!m || !u || (m[1] !== u.id && !u.isAdmin)) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  await createAdminClient().storage.from(BUCKET).remove([path]);
  return NextResponse.json({ ok: true });
}
