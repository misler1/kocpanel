// Konum (x, y) bilgisine dayalı PDF okuma yardımcıları.
// pdf-parse'ın düz metni iki sütunlu / hücreli tablolarda sayıları birbirine yapıştırır; metin parçalarının
// konumlarını kullanmak bu sorunu ortadan kaldırır.

export interface PdfItem {
  page: number; // 1'den başlar
  x: number;
  y: number; // PDF koordinatı: yukarı doğru artar
  w: number;
  str: string;
}

export interface Tok {
  page: number;
  x: number;
  y: number;
  s: string;
}

/**
 * Bazı PDF'lerde (yazı tipi / ligatür geçişlerinde) bir kelime birkaç parçaya bölünür ("Ad So"+"yad", "TYT-TÜRK"+"ÇE").
 * Aynı satırda, aralarında boşluk olmayan bitişik parçalar tek parçada birleştirilir.
 */
export function mergeAdjacent(items: PdfItem[]): PdfItem[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const out: PdfItem[] = [];
  for (const it of sorted) {
    const last = out[out.length - 1];
    if (
      last && last.page === it.page && Math.abs(last.y - it.y) < 1 &&
      it.x - (last.x + last.w) < 1.5 && it.x - (last.x + last.w) > -2 &&
      !/\s$/.test(last.str) && !/^\s/.test(it.str)
    ) {
      last.str += it.str;
      last.w = it.x + it.w - last.x;
    } else {
      out.push({ ...it });
    }
  }
  return out;
}

/** Her metin parçasını boşluklardan bölüp parça içi x konumunu tahmin eder. */
export function tokenize(rawItems: PdfItem[]): Tok[] {
  const items = mergeAdjacent(rawItems);
  const out: Tok[] = [];
  for (const it of items) {
    const str = it.str;
    if (!str || !str.trim()) continue;
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str))) {
      out.push({ page: it.page, x: it.x + (it.w * m.index) / str.length, y: it.y, s: m[0] });
    }
  }
  return out;
}

export interface Row {
  page: number;
  y: number;
  toks: Tok[]; // x'e göre sıralı
}

/** Aynı sayfadaki ve y'si birbirine yakın parçaları satırlar halinde toplar (yukarıdan aşağıya). */
export function clusterRows(toks: Tok[], tol = 2.5): Row[] {
  const sorted = [...toks].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const t of sorted) {
    const last = rows[rows.length - 1];
    if (last && last.page === t.page && Math.abs(last.y - t.y) <= tol) last.toks.push(t);
    else rows.push({ page: t.page, y: t.y, toks: [t] });
  }
  rows.forEach((r) => r.toks.sort((a, b) => a.x - b.x));
  return rows;
}

export const rowText = (r: Row) => r.toks.map((t) => t.s).join(' ');