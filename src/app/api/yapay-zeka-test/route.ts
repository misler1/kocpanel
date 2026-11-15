/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Yapay zekâ bağlantı testi (yalnızca yönetici): Gemini'ye kısa bir soru sorar; her model için cevap geldi mi,
// kaç saniye sürdü, hata varsa Google ne dedi. Anahtarın kendisi gösterilmez, yalnızca tanımlı olup olmadığı.
// Tarayıcıda açın: /api/yapay-zeka-test
export const maxDuration = 60;

const URL_OF = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

async function probe(model: string, key: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(URL_OF(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Yalnızca "tamam" yaz.' }] }],
        generationConfig: { maxOutputTokens: 50, ...(model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
      }),
    });
    const body: any = await res.json().catch(() => null);
    const text = (body?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
    return { model, durum: res.status, saniye: (Date.now() - t0) / 1000, cevap: text.slice(0, 40) || null, hata: body?.error?.message?.slice(0, 300) ?? null };
  } catch (e) {
    return { model, durum: 'bağlanamadı', saniye: (Date.now() - t0) / 1000, cevap: null, hata: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ hata: 'Oturum yok' }, { status: 401 });
  const { data: me } = await (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ hata: 'Yalnızca yönetici' }, { status: 403 });

  const key = process.env.GEMINI_API_KEY ?? '';
  const ayarlar = {
    GEMINI_API_KEY: key ? `tanımlı (${key.length} karakter, ${key.startsWith('AIza') ? 'AIza ile başlıyor' : 'AIza ile BAŞLAMIYOR'}${key.trim() !== key ? ', başında/sonunda BOŞLUK var' : ''})` : 'TANIMLI DEĞİL',
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? '(yok, varsayılan gemini-flash-latest)',
    GEMINI_VISION_MODEL: process.env.GEMINI_VISION_MODEL ?? '(yok)',
    GROQ_API_KEY: process.env.GROQ_API_KEY ? 'tanımlı' : 'tanımlı değil',
    bolge: process.env.VERCEL_REGION ?? null,
  };
  if (!key) return NextResponse.json({ ayarlar });
  const models = Array.from(new Set(['gemini-2.5-flash', 'gemini-flash-latest', process.env.GEMINI_MODEL].filter((m): m is string => !!m)));
  const sonuclar = await Promise.all(models.map((m) => probe(m, key.trim())));
  return NextResponse.json({ ayarlar, sonuclar });
}
