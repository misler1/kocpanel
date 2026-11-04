/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FillRect } from './pdfTemplates/items';

// Bazı karnelerde doğru / yanlış / boş bilgisi yalnızca hücre arka plan RENGİNDE bulunur (metinde yoktur).
// Bu yardımcı, pdf-parse'ın verdiği sayfadaki dolu dikdörtgenleri (konum + dolgu rengi) PDF çizim
// komutlarından okur. Çağırmadan önce yazı tipi yüklemesi kapatılmalıdır (bkz. disablePdfFontFace).

// pdf.js 1.10 (pdf-parse içindeki) çizim komutu numaraları
const OPS = {
  save: 10, restore: 11, transform: 12, moveTo: 13, lineTo: 14, curveTo: 15, curveTo2: 16, curveTo3: 17,
  rectangle: 19, fill: 22, eoFill: 23, endPath: 28, setFillGray: 57, setFillRGBColor: 59, constructPath: 91,
};

/**
 * Sunucuda `document` olmadığından pdf.js yazı tiplerini tarayıcıya yüklemeye çalışırsa süreç çöker.
 * pdf-parse'ın kullandığı pdf.js ayarları global `PDFJS` nesnesindedir; yeni açılan belgeler bunu okur.
 */
export function disablePdfFontFace() {
  const g = globalThis as any;
  if (g.PDFJS) g.PDFJS.disableFontFace = true;
  return !!g.PDFJS;
}

type M = [number, number, number, number, number, number];
const mul = (m: M, n: number[]): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** pageProxy: pdf-parse `pagerender` içindeki sayfa nesnesi */
export async function collectFillRects(pageProxy: any, pageNo: number): Promise<FillRect[]> {
  const ol = await pageProxy.getOperatorList();
  const out: FillRect[] = [];
  type Rgb = [number, number, number] | null;
  let ctm: M = [1, 0, 0, 1, 0, 0];
  let fill: Rgb = null;
  const stack: [M, Rgb][] = [];
  let pend: number[][] = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const f = ol.fnArray[i];
    const a = ol.argsArray[i];
    if (f === OPS.save) stack.push([ctm, fill]);
    else if (f === OPS.restore) [ctm, fill] = stack.pop() ?? [ctm, fill];
    else if (f === OPS.transform) ctm = mul(ctm, a);
    else if (f === OPS.setFillRGBColor) fill = [a[0], a[1], a[2]];
    else if (f === OPS.setFillGray) fill = [a[0] * 255, a[0] * 255, a[0] * 255];
    else if (f === OPS.constructPath) {
      pend = [];
      let k = 0;
      for (const op of a[0] as number[]) {
        if (op === OPS.rectangle) {
          const [x, y, w, h] = (a[1] as number[]).slice(k, k + 4);
          const p = apply(ctm, x, y);
          const q = apply(ctm, x + w, y + h);
          pend.push([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]);
          k += 4;
        } else if (op === OPS.moveTo || op === OPS.lineTo) k += 2;
        else if (op === OPS.curveTo) k += 6;
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) k += 4;
      }
    } else if (f === OPS.fill || f === OPS.eoFill) {
      if (fill && fill.every((v) => typeof v === 'number'))
        for (const [x0, y0, x1, y1] of pend) out.push({ page: pageNo, x0, y0, x1, y1, rgb: fill });
      pend = [];
    } else if (f === OPS.endPath) pend = [];
  }
  return out;
}
