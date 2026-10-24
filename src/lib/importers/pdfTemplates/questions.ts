import type { ExamQuestion } from './types';

// Karnedeki "KONU ANALİZİ" tablosu:  No · Konu(kazanım) · DC (doğru cevap) · ÖC (öğrenci cevabı) · SO · ÇZM
// Her ders başlığı (Türkçe, Matematik, Tarih…) ayrı satırda gelir, altında o dersin soruları sıralanır.

const SUBJECT_HEADINGS: { key: string; re: RegExp }[] = [
  { key: 'turkce', re: /^T[üu]rk[çc]e$/i },
  { key: 'matematik', re: /^Mate\S*$/i }, // PDF "Matema?k" gibi bozuk gelebiliyor
  { key: 'geometri', re: /^Geometri$/i },
  { key: 'tarih', re: /^Tarih$/i },
  { key: 'cografya', re: /^Co[ğg]rafya$/i },
  { key: 'felsefe', re: /^Felsefe$/i },
  { key: 'din', re: /^D[iİ]n K[üu]lt[üu]r[üu]$/i },
  { key: 'fizik', re: /^F[iİ]zik$/i },
  { key: 'kimya', re: /^K[iİ]mya$/i },
  { key: 'biyoloji', re: /^B[iİ]yoloji$/i },
];

// Bazı PDF'lerde "ft, fı, ti, tı" gibi birleşik harfler (ligatür) metne hiç çıkmıyor
// ("Paragra a" = Paragrafta). Bilinen bozuk kelimeler burada düzeltilir; yeni görülenler eklenebilir.
const WORD_FIXES: Record<string, string> = {
  Bişik: 'Bitişik',
  Kalar: 'Katılar',
  Koligaf: 'Koligatif',
  Kuvve: 'Kuvveti',
  Manksal: 'Mantıksal',
  Paragra: 'Paragrafı',
  Paragraa: 'Paragrafta',
  Paragran: 'Paragrafın',
  'Yerleşr…': 'Yerleştir…',
  'Yerleşr...': 'Yerleştir...',
  Çi: 'Çift',
};

/** Düşen "ti/tı/ft/fı" ligatürlerini (konumlu okumada \u0000 olarak kalır) bağlamdan geri kazanır. */
export function fixLigatures(raw: string): string {
  let s = raw.replace(/[\uFFFD]/g, '\u0000');
  s = s
    .replace(/Paragra\u0000n/g, 'Paragrafın')
    .replace(/Paragra\u0000a/g, 'Paragrafta')
    .replace(/Paragra\u0000/g, 'Paragrafı')
    .replace(/Koliga\u0000f/g, 'Koligatif')
    .replace(/[Çç]i\u0000/g, (m) => m[0] + 'ift');
  // Kalanlar: ünlü uyumuyla ti / tı
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\u0000') { out += s[i]; continue; }
    const prev = [...out].reverse().find((c) => /[aeıioöuüAEIİOÖUÜ]/.test(c));
    out += prev && /[eiöüEİÖÜ]/.test(prev) ? 'ti' : 'tı';
  }
  return out;
}

export function repairTopic(raw: string): string {
  const clean = fixLigatures(raw).replace(/\s+/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => WORD_FIXES[w] ?? w)
    .join(' ');
}

export function parseQuestions(section: string): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  let subject: string | null = null;
  let expected = 1;

  for (const rawLine of section.split('\n')) {
    const line = rawLine.replace(/\u0000/g, '').trim();
    if (!line) continue;

    // Ders başlığı satırı
    const head = SUBJECT_HEADINGS.find((h) => h.re.test(line));
    if (head) {
      subject = head.key;
      continue;
    }
    if (!subject) continue;

    // Soru satırı: önce beklenen sıra numarasıyla dene ("20. Yüzyıl" gibi konu adları için)
    let m: RegExpMatchArray | null = null;
    const tail = String.raw`\s*(.*?)\s*(?:([A-E])\s*)?(?:([A-E])\s*)?([+-])?\s*$`;
    if (line.startsWith(String(expected))) {
      m = line.match(new RegExp(`^(${expected})${tail}`));
    }
    if (!m) m = line.match(new RegExp(String.raw`^(\d{1,2})` + tail));
    if (!m || !m[2]) continue;

    const no = parseInt(m[1], 10);
    const topic = repairTopic(m[2]);
    const dc = m[3] ?? null;
    const oc = m[4] ?? null;
    if (!dc || !topic) continue;
    const r: 'D' | 'Y' | 'B' = !oc ? 'B' : m[5] === '+' ? 'D' : m[5] === '-' ? 'Y' : oc === dc ? 'D' : 'Y';

    out.push({ s: subject, n: no, k: topic, dc, oc, r });
    expected = no + 1;
  }
  return out;
}