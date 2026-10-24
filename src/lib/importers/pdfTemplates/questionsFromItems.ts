import type { ExamQuestion } from './types';
import { repairTopic } from './questions';
import { mergeAdjacent, type PdfItem } from './items';

/** Hata ayıklama: son okumada konu analizi neden boş kaldı */
export const qDiag = { info: '' };

// Konuma dayalı "KONU ANALİZİ" okuması (üç sütunlu tablo: No · Konu · DC · ÖC · SO · ÇZM).
// Her ders başlığı "Edebiyat (EDE-SOS)" biçimindedir; parantez içindeki kod sınav bölümünü belirtir.

export interface ItemQuestion extends ExamQuestion {
  examType: 'TYT' | 'AYT';
}

const NAME_KEYS: Record<string, string> = {
  edebiyat: 'edebiyat', 'türkçe': 'turkce', turkce: 'turkce',
  tarih: 'tarih', 'coğrafya': 'cografya', cografya: 'cografya',
  felsefe: 'felsefe', 'din kültürü': 'din', matematik: 'matematik', geometri: 'matematik',
  fizik: 'fizik', kimya: 'kimya', biyoloji: 'biyoloji',
};

function subjectKey(name: string, code: string): { key: string; type: 'TYT' | 'AYT' } | null {
  const n = name.toLocaleLowerCase('tr-TR').trim();
  const base = NAME_KEYS[n];
  if (!base) return null;
  const c = code.toUpperCase();
  if (c.startsWith('TYT')) return { key: base, type: 'TYT' };
  // AYT: tarih / coğrafya iki ayrı grupta (Sosyal-1, Sosyal-2)
  if (c.startsWith('EDE')) return { key: base === 'tarih' ? 'tarih1' : base === 'cografya' ? 'cografya1' : base, type: 'AYT' };
  if (c.startsWith('SOS')) {
    const k = base === 'tarih' ? 'tarih2' : base === 'cografya' ? 'cografya2' : base === 'felsefe' ? 'felsefe_grubu' : base;
    return { key: k, type: 'AYT' };
  }
  return { key: base, type: 'AYT' };
}

const joinItems = (its: PdfItem[]) => {
  const s = [...its].sort((a, b) => a.x - b.x);
  let out = '';
  let end = -Infinity;
  for (const it of s) {
    if (out && it.x - end > 1.2) out += ' ';
    out += it.str;
    end = it.x + it.w;
  }
  return out.replace(/\s+/g, ' ').trim();
};

export function parseQuestionsFromItems(rawItems: PdfItem[] | undefined): ItemQuestion[] {
  qDiag.info = '';
  if (!rawItems?.length) { qDiag.info = 'items boş'; return []; }
  const items = mergeAdjacent(rawItems);
  const out: ItemQuestion[] = [];
  const notes: string[] = [];
  let cur: { key: string; type: 'TYT' | 'AYT' } | null = null;

  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pi = items.filter((i) => i.page === page && i.str.trim() !== '');
    // Sütun başlığı satırı: "No" · "Konu" · "DC" · "ÖC" · "SO" · "ÇZM" (üç kez)
    const noHeads = pi.filter((i) => i.str.trim() === 'No').sort((a, b) => a.x - b.x);
    if (noHeads.length === 0) { notes.push(`s${page}: 'No' başlığı yok`); continue; }
    const headY = noHeads[0].y;
    const bands = noHeads.map((h, bi) => {
      const x0 = h.x - 12;
      const x1 = bi + 1 < noHeads.length ? noHeads[bi + 1].x - 12 : Infinity;
      const inBand = (i: PdfItem) => i.x >= x0 && i.x < x1;
      const hdr = pi.filter((i) => Math.abs(i.y - headY) < 3 && inBand(i));
      const col = (name: string) => hdr.find((i) => i.str.trim() === name)?.x;
      return { x0, x1, noX: h.x, dc: col('DC'), oc: col('ÖC'), so: col('SO'), inBand };
    });

    for (const b of bands) {
      if (b.dc === undefined) { notes.push(`s${page}: DC başlığı yok (başlık parçaları: ${pi.filter((i) => Math.abs(i.y - headY) < 3).map((i) => i.str).join('|')})`); continue; }
      const bandItems = pi.filter((i) => b.inBand(i) && i.y < headY - 3);
      // satırlara ayır (yukarıdan aşağıya)
      const sorted = [...bandItems].sort((a, c) => c.y - a.y || a.x - c.x);
      const rows: PdfItem[][] = [];
      for (const it of sorted) {
        const last = rows[rows.length - 1];
        if (last && Math.abs(last[0].y - it.y) <= 2.5) last.push(it);
        else rows.push([it]);
      }
      for (const row of rows) {
        const text = joinItems(row);
        const head = text.match(/^(.+?)\s*\(([A-Za-zİıÇçŞşĞğÜüÖö0-9-]+)\)$/);
        if (head && !/^\d/.test(text)) {
          cur = subjectKey(head[1], head[2]);
          continue;
        }
        if (!cur) continue;
        const first = [...row].sort((a, c) => a.x - c.x)[0];
        if (!/^\d{1,2}$/.test(first.str.trim()) || first.x > b.noX + 25) continue;
        const rest = row.filter((i) => i !== first);
        const dcX = b.dc as number;
        const topicItems = rest.filter((i) => i.x < dcX - 9);
        const cells = rest.filter((i) => i.x >= dcX - 9);
        const cx = [dcX, b.oc ?? dcX + 15, b.so ?? dcX + 31];
        const cell: (string | null)[] = [null, null, null];
        for (const c of cells) {
          let bi = 0;
          for (let k = 1; k < 3; k++) if (Math.abs(cx[k] - c.x) < Math.abs(cx[bi] - c.x)) bi = k;
          if (Math.abs(cx[bi] - c.x) <= 9 && !cell[bi]) cell[bi] = c.str.trim();
        }
        const dc = cell[0];
        const topic = repairTopic(joinItems(topicItems));
        if (!dc || !/^[A-E]$/.test(dc) || !topic) continue;
        const oc = cell[1] && /^[A-E]$/.test(cell[1]) ? cell[1] : null;
        const so = cell[2];
        const r: 'D' | 'Y' | 'B' = !oc ? 'B' : so === '+' ? 'D' : so === '-' ? 'Y' : oc === dc ? 'D' : 'Y';
        out.push({ s: cur.key, n: parseInt(first.str, 10), k: topic, dc, oc, r, examType: cur.type });
      }
    }
  }
  if (out.length === 0) qDiag.info = notes.join(' ; ') || 'başlıklar bulundu ama soru satırı çıkmadı';
  return out;
}