// Herkese açık formlar için hafif bot koruması: captcha anahtarı ya da ek tablo gerektirmez.
//  - honeypot: insanların görmediği gizli alan doluysa bottur
//  - doldurma süresi: form açıldıktan 3 sn içinde gönderilemez (botlar anında gönderir)
//  - IP başına sınır: aynı IP'den kısa sürede çok istek gelirse reddedilir
// IP sınırı sunucu örneği başına bellekte tutulur; kesin değildir ama seri denemeleri keser.
// Kalıcı/global sınır, çağıran rotanın veritabanı sayımıyla sağlanır.

export const HONEYPOT_FIELD = 'website';
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

const hits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

/** Aynı anahtar için windowMs içinde en fazla `limit` istek; aşılırsa false. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}

/** Form gövdesindeki honeypot ve doldurma süresini kontrol eder; bot gibi görünüyorsa true. */
export function looksLikeBot(body: Record<string, unknown>): boolean {
  if (String(body[HONEYPOT_FIELD] ?? '').trim() !== '') return true;
  const startedAt = Number(body.formStartedAt);
  if (!Number.isFinite(startedAt)) return true;
  const elapsed = Date.now() - startedAt;
  return elapsed < MIN_FILL_MS || elapsed > MAX_FILL_MS;
}
