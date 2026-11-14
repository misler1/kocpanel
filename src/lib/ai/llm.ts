// Ücretsiz yapay zekâ çağrısı: önce Google Gemini (GEMINI_API_KEY varsa), olmazsa ya da hata verirse Groq.
// Gemini: aistudio.google.com'dan ücretsiz anahtar. Model GEMINI_MODEL ile değiştirilebilir.
// Yalnızca sunucu tarafında kullanın.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type LlmRequest = {
  system: string;
  /** Gemini'ye giden tam istem (büyük bağlam) */
  user: string;
  /** Groq'un ücretsiz kotası küçük olduğu için kısaltılmış istem (verilmezse user kullanılır) */
  userCompact?: string;
  maxTokens?: number;
};

export type LlmResult = { text: string; provider: 'gemini' | 'groq'; model: string };

async function callGemini(req: LlmRequest): Promise<LlmResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY yok');
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const res = await fetch(GEMINI_URL(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        temperature: 0.4,
        // Düşünen modellerde düşünme de bu sınırdan yer; yanıt kesilmesin diye geniş tutulur
        maxOutputTokens: Math.max(req.maxTokens ?? 4000, 8192),
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error(`Gemini boş yanıt (${data?.candidates?.[0]?.finishReason ?? 'bilinmiyor'})`);
  return { text, provider: 'gemini', model };
}

async function callGroq(req: LlmRequest): Promise<LlmResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY yok');
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const body = (json: boolean) => JSON.stringify({
    model,
    messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.userCompact ?? req.user }],
    temperature: 0.3,
    max_tokens: req.maxTokens ?? 4000,
    reasoning_effort: 'medium',
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  const send = (json: boolean) => fetch(GROQ_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body(json),
  });
  let res = await send(true);
  if (res.status === 400) res = await send(false); // JSON doğrulaması takılırsa serbest metinle tekrar
  if (!res.ok) {
    if (res.status === 413 || res.status === 429) {
      throw new Error('Ücretsiz yapay zekâ kotası bu istek için yetmedi. Daha az deneme seçin ya da biraz sonra tekrar deneyin.');
    }
    throw new Error(`Groq ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  }
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('Yapay zekâ boş yanıt döndürdü. Lütfen tekrar deneyin.');
  return { text, provider: 'groq', model };
}

/** Önce Gemini, olmazsa Groq. Hata mesajları kullanıcıya gösterilebilir. */
export async function callLlm(req: LlmRequest): Promise<LlmResult> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(req);
    } catch (e) {
      console.error('Gemini başarısız, Groq deneniyor:', e);
      if (!process.env.GROQ_API_KEY) throw e;
    }
  }
  return callGroq(req);
}

/** Görselden metin (ör. defterdeki el yazısı). Yalnızca Gemini (Groq'un ücretsiz modeli görsel okumaz). */
export async function readImageText(req: { system: string; prompt: string; imageBase64: string; mimeType: string }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Yazı okuma için yapay zekâ anahtarı (GEMINI_API_KEY) tanımlı değil.');
  // Model bulunamazsa (ad değişmiş olabilir) sıradakini dene
  const models = Array.from(new Set([process.env.GEMINI_VISION_MODEL, process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash']
    .filter((m): m is string => !!m)));
  let res: Response | null = null;
  let detail = '';
  for (const model of models) {
    res = await fetch(GEMINI_URL(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: req.mimeType, data: req.imageBase64 } }, { text: req.prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    });
    if (res.ok) break;
    const body = await res.json().catch(() => null);
    detail = String(body?.error?.message ?? '').slice(0, 200);
    console.error(`Gemini görsel okuma ${model}: ${res.status} ${detail}`);
    if (res.status !== 404) break;
  }
  if (!res || !res.ok) {
    const st = res?.status ?? 0;
    if (st === 429) throw new Error('Yapay zekâ kotası doldu, biraz sonra tekrar deneyin.');
    if (st === 400 && /api key/i.test(detail)) throw new Error('Yapay zekâ anahtarı geçersiz (GEMINI_API_KEY yanlış kopyalanmış olabilir).');
    if (st === 403) throw new Error(`Yapay zekâ anahtarının bu işleme izni yok (403). ${detail}`);
    throw new Error(`Yazı okunamadı (hata ${st}${detail ? `: ${detail}` : ''}).`);
  }
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? 'bilinmiyor';
    throw new Error(`Fotoğrafta okunabilir yazı bulunamadı (${reason}).`);
  }
  return text;
}

/** Model yanıtındaki JSON'u çıkarır (```json bloklarını ve baştaki/sondaki metni temizler) */
export function parseJsonLoose<T>(content: string): T {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1)) as T;
    throw new Error('Yapay zekâ geçerli bir sonuç döndürmedi. Lütfen tekrar deneyin.');
  }
}
