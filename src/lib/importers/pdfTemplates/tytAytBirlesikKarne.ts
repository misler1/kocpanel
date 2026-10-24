import type { PdfTemplate, ExtractedPdfRecord } from './types';
import { tokenize, clusterRows, rowText, type PdfItem, type Tok } from './items';
import { parseRankingsFromItems } from './rankings';
import { parseQuestionsFromItems } from './questionsFromItems';
import { netYKS, trDateToIso, toResults, type DY } from './shared';

// ───────── Şablon: TYT + AYT birlikte tek öğrenci karnesi (iki sütunlu "TYT DERS ANALİZİ | AYT DERS ANALİZİ") ─────────
// Bu karnede TYT tablosu solda, AYT tablosu sağdadır. Bu şablon TYT bölümünü okur
// (AYT bölümü ve AYT puanları şimdilik alınmaz).

// Soldaki tablonun satır sırası (soru sayılarıyla doğrulanır)
const LAYOUTS: { sorus: number[]; keys: (string | null)[] }[] = [
  // Matematik + Geometri ayrı satırlı, ardından TYT-MATEMATİK toplamı
  {
    sorus: [40, 5, 5, 5, 5, 20, 30, 10, 40, 7, 7, 6, 20, 120],
    keys: ['turkce', 'tarih', 'cografya', 'felsefe', 'din', 'sosyal', null, null, 'matematik', 'fizik', 'kimya', 'biyoloji', 'fen', 'toplam'],
  },
  {
    sorus: [40, 5, 5, 5, 5, 20, 40, 7, 7, 6, 20, 120],
    keys: ['turkce', 'tarih', 'cografya', 'felsefe', 'din', 'sosyal', 'matematik', 'fizik', 'kimya', 'biyoloji', 'fen', 'toplam'],
  },
];
const EXTRA_KEYS = new Set(['sosyal', 'fen', 'toplam', 'sosyal1', 'sosyal2']);

// Sağdaki AYT tablosunun satır sırası
const AYT_LAYOUTS: { sorus: number[]; keys: (string | null)[] }[] = [
  {
    sorus: [24, 10, 6, 40, 11, 11, 12, 6, 40, 26, 14, 40, 14, 13, 13, 40, 160],
    keys: ['edebiyat', 'tarih1', 'cografya1', 'sosyal1', 'tarih2', 'cografya2', 'felsefe_grubu', 'din', 'sosyal2', null, null, 'matematik', 'fizik', 'kimya', 'biyoloji', 'fen', 'toplam'],
  },
  {
    sorus: [24, 10, 6, 40, 11, 11, 12, 6, 40, 40, 14, 13, 13, 40, 160],
    keys: ['edebiyat', 'tarih1', 'cografya1', 'sosyal1', 'tarih2', 'cografya2', 'felsefe_grubu', 'din', 'sosyal2', 'matematik', 'fizik', 'kimya', 'biyoloji', 'fen', 'toplam'],
  },
];

const isNum = (s: string) => /^-?\d+(?:,\d+)?$/.test(s);
const toF = (s: string) => parseFloat(s.replace(',', '.'));

interface Cand { soru: number; d: number; y: number; slots: number[]; ort: number | null }

/** Satırdaki sayılar: SORU [DOĞRU] [YANLIŞ] [BOŞ] NET ORT — boş hücreler yazılmıyor. Net ile doğrulanarak aday çözümler üretilir. */
function candidates(vals: string[]): Cand[] {
  const ci = vals.findIndex((v) => v.includes(','));
  if (ci < 1) return [];
  const ints = vals.slice(0, ci);
  if (ints.some((v) => v.includes(','))) return [];
  const net = toF(vals[ci]);
  const ort = vals[ci + 1] !== undefined ? toF(vals[ci + 1]) : null;
  const soru = parseInt(ints[0], 10);
  const mid = ints.slice(1).map((v) => parseInt(v, 10));
  const masks = [[0, 1, 2], [0, 1], [0, 2], [1, 2], [0], [1], [2], []].filter((m) => m.length === mid.length);
  const out: Cand[] = [];
  for (const m of masks) {
    const a = [0, 0, 0];
    m.forEach((slot, i) => (a[slot] = mid[i]));
    const [d, y, b] = a;
    if (d + y + b !== soru) continue;
    if (Math.abs(netYKS(d, y) - net) > 0.006) continue;
    out.push({ soru, d, y, slots: m, ort });
  }
  return out;
}

function headerValue(rows: ReturnType<typeof clusterRows>, label: string, stopAt: string[]): string {
  const row = rows.find((r) => r.toks[0]?.s === label.split(' ')[0] && rowText(r).startsWith(label));
  if (!row) return '';
  const words = row.toks.map((t) => t.s).slice(label.split(' ').length);
  const end = words.findIndex((w) => stopAt.includes(w));
  return (end >= 0 ? words.slice(0, end) : words).join(' ');
}

/** Hata ayıklama: şablonun son çalıştırmada nerede durduğu */
export const diag = { reason: '' };

export const tytAytBirlesikKarneTemplate: PdfTemplate = {
  id: 'tyt-ayt-birlesik-karne',
  label: 'TYT + AYT – Tek öğrenci karnesi (iki sütunlu)',
  examType: 'TYT',
  canParse: (t, items) =>
    !!items?.length && /TYT\s*DERS\s*ANAL[İI]Z[İI]/i.test(t) && /AYT\s*DERS\s*ANAL[İI]Z[İI]/i.test(t),
  parse: (_t, _s, items) => {
    const empty = { examName: null, examDate: null, records: [] as ExtractedPdfRecord[] };
    diag.reason = '';
    if (!items?.length) { diag.reason = 'items boş'; return empty; }
    const page1 = items.filter((i: PdfItem) => i.page === 1);
    const allRows = clusterRows(tokenize(page1), 2.5);

    // Başlık bilgileri
    const rawName = headerValue(allRows, 'Ad Soyad', ['Numara']).trim();
    const sinavAdi = headerValue(allRows, 'Sınav Adı', ['Kitapçık']).trim();
    const dateRow = allRows.find((r) => rowText(r).startsWith('Sınav Tarihi'));
    const examDate = trDateToIso(dateRow ? rowText(dateRow) : null);
    if (!rawName) { diag.reason = `ad soyad bulunamadı; ilk satırlar: ${allRows.slice(0, 6).map(rowText).join(' // ')}`; return empty; }
    // Tablo başlığı: ikinci "DERS" sütun başlığı sağ tabloyu ayırır
    const hdrIdx = allRows.findIndex((r) => r.toks.filter((t) => t.s === 'DERS').length >= 2);
    if (hdrIdx < 0) { diag.reason = `tablo başlığı (iki 'DERS') bulunamadı; satırlar: ${allRows.slice(0, 14).map(rowText).join(' // ')}`; return empty; }
    const hdr = allRows[hdrIdx];
    const dersToks = hdr.toks.filter((t) => t.s === 'DERS');
    const splitX = dersToks[1].x - 20;

    const rankIdx = allRows.findIndex((r) => /PUAN\s+VE\s+SIRALAMALAR/i.test(rowText(r)));
    const tableRows = allRows.slice(hdrIdx + 1, rankIdx > hdrIdx ? rankIdx : undefined);

    const readTable = (region: (x: number) => boolean, layouts: typeof LAYOUTS) => {
      const numRows: Tok[][] = [];
      const toks: Tok[] = tableRows.flatMap((r) => r.toks).filter((t) => region(t.x) && isNum(t.s));
      for (const r of clusterRows(toks, 2.5)) {
        if (r.toks.some((t) => t.s.includes(',')) && r.toks.length >= 3) numRows.push(r.toks);
      }
      const cands = numRows.map((r) => candidates(r.map((t) => t.s)));
      // Sütun konumlarını, tek çözümlü satırlardan öğren (DOĞRU / YANLIŞ / BOŞ x konumları)
      const colSum = [0, 0, 0], colN = [0, 0, 0];
      cands.forEach((c, i) => {
        if (c.length !== 1) return;
        c[0].slots.forEach((slot, k) => { colSum[slot] += numRows[i][1 + k].x; colN[slot]++; });
      });
      const colX = colSum.map((v, k) => (colN[k] ? v / colN[k] : NaN));
      const solved = cands.map((c, i) => {
        if (c.length <= 1) return c[0] ?? null;
        let best = c[0], bestScore = Infinity;
        for (const cand of c) {
          let sc = 0;
          cand.slots.forEach((slot, k) => { sc += Number.isFinite(colX[slot]) ? Math.abs(numRows[i][1 + k].x - colX[slot]) : 0; });
          if (sc < bestScore) { bestScore = sc; best = cand; }
        }
        return best;
      });
      const layout = layouts.find((l) => l.sorus.length === solved.length && l.sorus.every((s, i) => solved[i]?.soru === s));
      if (!layout) return null;
      const map: Record<string, DY> = {};
      const averages: Record<string, number> = {};
      layout.keys.forEach((key, i) => {
        const r = solved[i];
        if (!key || !r) return;
        if (r.ort !== null) averages[key] = r.ort;
        if (!EXTRA_KEYS.has(key)) map[key] = { d: r.d, y: r.y };
      });
      return Object.keys(map).length >= 3 ? { map, averages } : null;
    };

    const tyt = readTable((x) => x < splitX, LAYOUTS);
    const ayt = readTable((x) => x >= splitX, AYT_LAYOUTS);
    if (!tyt && !ayt) { diag.reason = `ders satırları çözülemedi; tablo satırları: ${tableRows.slice(0, 30).map(rowText).join(' // ')}`; return empty; }

    // Puanlar ve sıralamalar
    const rkTyt = parseRankingsFromItems(page1, 'TYT');
    const rkPer: Record<string, ReturnType<typeof parseRankingsFromItems>> = {};
    for (const k of ['SAY', 'EA', 'SÖZ']) rkPer[k] = parseRankingsFromItems(page1, k);
    const puanlar: Record<string, number> = {};
    let best: { puan: number; rankings: NonNullable<ReturnType<typeof parseRankingsFromItems>>['rankings'] } | null = null;
    for (const [k, v] of Object.entries(rkPer)) {
      if (!v || v.puan == null) continue;
      puanlar[k === 'SÖZ' ? 'soz' : k.toLowerCase()] = v.puan;
      if (!best || v.puan > best.puan) best = { puan: v.puan, rankings: v.rankings };
    }

    // Konu / kazanım analizi (konuma göre)
    const allQ = parseQuestionsFromItems(items);
    const strip = (q: (typeof allQ)[number]) => { const { examType: _t, ...rest } = q; void _t; return rest; };

    const splitName = (t: 'TYT' | 'AYT') => {
      const p = sinavAdi.split(/\b(AYT|TYT)\s*:/).map((x) => x.trim());
      for (let i = 1; i < p.length; i += 2) if (p[i] === t && p[i + 1]) return p[i + 1];
      return sinavAdi || null;
    };

    const records: ExtractedPdfRecord[] = [];
    if (tyt) {
      const qs = allQ.filter((q) => q.examType === 'TYT').map(strip);
      records.push({
        rawName, examType: 'TYT', examName: splitName('TYT'), examDate, results: toResults(tyt.map),
        ...(rkTyt?.puan != null ? { puan: rkTyt.puan } : {}),
        ...(Object.keys(tyt.averages).length ? { averages: tyt.averages } : {}),
        ...(rkTyt && Object.keys(rkTyt.rankings).length ? { rankings: rkTyt.rankings } : {}),
        ...(qs.length ? { questions: qs } : {}),
      });
    }
    if (ayt) {
      const qs = allQ.filter((q) => q.examType === 'AYT').map(strip);
      records.push({
        rawName, examType: 'AYT', examName: splitName('AYT'), examDate, results: toResults(ayt.map),
        ...(Object.keys(puanlar).length ? { puanlar } : {}),
        ...(Object.keys(ayt.averages).length ? { averages: ayt.averages } : {}),
        ...(best && Object.keys(best.rankings).length ? { rankings: best.rankings } : {}),
        ...(qs.length ? { questions: qs } : {}),
      });
    }
    return { examName: records[0].examName ?? null, examDate, records };
  },
};