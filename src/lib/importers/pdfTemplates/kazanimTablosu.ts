import type { ExamQuestion } from './types';
import type { PdfItem } from './items';

// Karnelerdeki "kazanım bazında S / D / Y / %" tabloları (soru numarası verilmez, yalnızca sayılar).
// Sayfa birden çok sütundan oluşabilir; her sütunun başlığında "S D Y B%" ya da "SS D Y %" bulunur.
// Ders başlıkları ya başlık satırının solunda (3D: "Türkçe S D Y B%") ya da sayı içermeyen ayrı satırlarda
// (AKBİM: "TÜRKÇE", "TAR-1", "T. MAT") verilir; ders anahtarını `sectionOf` belirler (tanınmazsa null).

export interface KazanimRow {
  s: string;   // ders anahtarı
  k: string;   // kazanım / konu adı
  soru: number;
  d: number;
  y: number;
}

const isInt = (s: string) => /^\d+$/.test(s);

export function parseKazanimTable(pageItems: PdfItem[], sectionOf: (label: string) => string | null): KazanimRow[] {
  const items = pageItems.filter((i) => i.str.trim() !== '').map((i) => ({ ...i, str: i.str.trim() }));
  const sameY = (a: PdfItem, b: PdfItem) => Math.abs(a.y - b.y) < 1.5;

  // Başlık sütunları: S|SS · D · Y · B%|% aynı satırda, soldan sağa bu sırayla
  const heads = items.filter((i) => /^S{1,2}$/.test(i.str));
  type Col = { sx: number; dx: number; yx: number; px: number; topY: number };
  const cols: Col[] = [];
  for (const h of heads) {
    const row = items.filter((i) => sameY(i, h) && i.x > h.x && i.x < h.x + 60).sort((a, b) => a.x - b.x);
    const d = row.find((i) => i.str === 'D');
    const y = row.find((i) => i.str === 'Y' && d && i.x > d.x);
    const p = row.find((i) => /^B?%$/.test(i.str) && y && i.x > y.x);
    if (!d || !y || !p) continue;
    const same = cols.find((c) => Math.abs(c.px - p.x) < 6);
    if (same) { same.topY = Math.max(same.topY, h.y); continue; }
    cols.push({ sx: h.x, dx: d.x, yx: y.x, px: p.x, topY: h.y });
  }
  if (!cols.length) return [];
  cols.sort((a, b) => a.px - b.px);
  const colOf = (x: number) => cols.findIndex((c) => x <= c.px + 8);

  const out: KazanimRow[] = [];
  let cur: string | null = null; // bir ders bölümü sütun sonunda başlayıp sonraki sütunda sürebilir
  cols.forEach((c, ci) => {
    const left = ci === 0 ? -Infinity : cols[ci - 1].px + 8;
    const inCol = items.filter((i) => i.y <= c.topY + 1.5 && i.x > left && colOf(i.x) === ci);
    // Satırlar (yukarıdan aşağıya)
    const rows: PdfItem[][] = [];
    for (const it of [...inCol].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const last = rows[rows.length - 1];
      if (last && sameY(last[0], it)) last.push(it);
      else rows.push([it]);
    }
    for (const r of rows) {
      r.sort((a, b) => a.x - b.x);
      const labelItems = r.filter((i) => i.x < c.sx - 4);
      const label = labelItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      const nums = r.filter((i) => i.x >= c.sx - 6);
      const near = (x: number) => { // sütunlar birbirine çok yakın: en yakın hücre
        let best: PdfItem | undefined;
        for (const i of nums) if (!best || Math.abs(i.x - x) < Math.abs(best.x - x)) best = i;
        return best && Math.abs(best.x - x) < 6 ? best : undefined;
      };
      const sTok = near(c.sx); const dTok = near(c.dx); const yTok = near(c.yx);
      if (sTok && /^S{1,2}$/.test(sTok.str)) { // ders başlığı satırı (3D)
        if (label) cur = sectionOf(label) ?? cur;
        continue;
      }
      if (sTok && dTok && yTok && isInt(sTok.str) && isInt(dTok.str) && isInt(yTok.str)) {
        const soru = +sTok.str; const d = +dTok.str; const y = +yTok.str;
        if (cur && label && soru > 0 && d + y <= soru) out.push({ s: cur, k: label, soru, d, y });
        continue;
      }
      if (!nums.length && label) { // sayısız satır: ders başlığı olabilir (AKBİM)
        const sec = sectionOf(label);
        if (sec) cur = sec;
      }
    }
  });
  return out;
}

/**
 * Kazanım sayılarını soru kayıtlarına açar. Soru numarası bilinmediği için `ks: true` işaretlidir:
 * kazanım analizinde kullanılır, soru soru cevap gösteriminde kullanılmaz.
 */
export function expandKazanim(rows: KazanimRow[]): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  const counter = new Map<string, number>();
  for (const r of rows) {
    for (let i = 0; i < r.soru; i++) {
      const n = (counter.get(r.s) ?? 0) + 1;
      counter.set(r.s, n);
      const res: 'D' | 'Y' | 'B' = i < r.d ? 'D' : i < r.d + r.y ? 'Y' : 'B';
      out.push({ s: r.s, n, k: r.k, dc: '', oc: null, r: res, ks: true });
    }
  }
  return out;
}

/** Ders bazında doğru/yanlış toplamları */
export function sumBySubject(rows: KazanimRow[]): Record<string, { d: number; y: number; soru: number }> {
  const out: Record<string, { d: number; y: number; soru: number }> = {};
  for (const r of rows) {
    const c = (out[r.s] ??= { d: 0, y: 0, soru: 0 });
    c.d += r.d; c.y += r.y; c.soru += r.soru;
  }
  return out;
}
