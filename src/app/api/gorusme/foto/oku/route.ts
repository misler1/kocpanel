import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET, canSeeStudent, studentOfPath } from '@/lib/meeting-photos';
import { readImageText } from '@/lib/ai/llm';

// Defter fotoğrafındaki el yazısını metne çevirir (Gemini). Body: { path }. Sonuç görüşme notlarına eklenir; koç kontrol eder.
export const maxDuration = 120; // el yazısı okuma uzun sürebilir

const SYSTEM = 'Sen el yazısı okuyan bir yardımcısın. Türkçe yazılmış defter notlarını metne çevirirsin. Yalnızca okuduğun metni yazarsın; yorum, özet ya da açıklama eklemezsin.';
const PROMPT = `Bu fotoğraf, bir eğitim koçunun öğrenciyle görüşme sırasında deftere el yazısıyla aldığı notlardır.
Yazıyı olduğu gibi düz metne çevir:
- Satır ve madde yapısını koru (madde işaretleri için "• " kullan).
- Kısaltmaları açma, kelimeleri düzeltmeye çalışma; yazılanı yaz.
- Okuyamadığın kelimenin yerine [?] yaz.
- Çizili (karalanmış) yazıları atla.
- Başlık, giriş cümlesi ya da açıklama ekleme; sadece metni ver.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const path = typeof body?.path === 'string' ? body.path : null;
  const sid = studentOfPath(path);
  if (!sid || !(await canSeeStudent(sid))) return NextResponse.json({ error: 'Fotoğraf bulunamadı' }, { status: 404 });

  const { data: file, error } = await createAdminClient().storage.from(BUCKET).download(path!);
  if (error || !file) return NextResponse.json({ error: 'Fotoğraf bulunamadı' }, { status: 404 });

  try {
    const text = await readImageText({
      system: SYSTEM,
      prompt: PROMPT,
      imageBase64: Buffer.from(await file.arrayBuffer()).toString('base64'),
      mimeType: file.type || 'image/jpeg',
    });
    return NextResponse.json({ ok: true, text: text.replace(/^```[a-z]*\s*|```\s*$/g, '').trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Yazı okunamadı' }, { status: 502 });
  }
}
