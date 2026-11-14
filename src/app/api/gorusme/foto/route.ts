import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET, TYPES, canSeeStudent, studentOfPath } from '@/lib/meeting-photos';

// Görüşme defter fotoğrafları (supabase/meeting_photos.sql). Depo herkese kapalıdır; erişim yalnızca bu adresten:
// kullanıcı öğrenciyi görebiliyorsa (veritabanı izinleri) yükler, kısa süreli bağlantıyla açar ya da siler.
// Yol biçimi: <öğrenci id>/<rastgele id>.<uzantı>

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const studentId = String(form?.get('studentId') ?? '');
  const file = form?.get('file');
  if (!/^[0-9a-f-]{36}$/.test(studentId) || !(file instanceof Blob)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Yalnızca fotoğraf yüklenebilir (JPG, PNG, HEIC).' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Fotoğraf çok büyük (en fazla 10 MB).' }, { status: 400 });
  if (!(await canSeeStudent(studentId))) return NextResponse.json({ error: 'Bu öğrenciye erişiminiz yok' }, { status: 403 });

  const path = `${studentId}/${randomUUID()}.${ext}`;
  const { error } = await createAdminClient().storage.from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error('Görüşme fotoğrafı yüklenemedi:', error.message);
    const missing = /bucket not found/i.test(error.message);
    return NextResponse.json({
      error: missing ? 'Fotoğraf deposu henüz kurulmadı (meeting_photos.sql çalıştırılmalı).' : `Fotoğraf yüklenemedi: ${error.message}`,
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path });
}

/** Fotoğrafı açar: 10 dakikalık imzalı bağlantıya yönlendirir */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path');
  const sid = studentOfPath(path);
  if (!sid || !(await canSeeStudent(sid))) return new NextResponse('Bulunamadı', { status: 404 });
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path!, 600);
  if (error || !data?.signedUrl) return new NextResponse('Bulunamadı', { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, max-age=300' } });
}

export async function DELETE(req: Request) {
  const path = new URL(req.url).searchParams.get('path');
  const sid = studentOfPath(path);
  if (!sid || !(await canSeeStudent(sid))) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  await createAdminClient().storage.from(BUCKET).remove([path!]);
  return NextResponse.json({ ok: true });
}
