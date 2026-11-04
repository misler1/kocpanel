/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PdfItem, FillRect } from './pdfTemplates/items';
import { collectFillRects, disablePdfFontFace } from './readPdfFillRects';

// pdf-parse varsayılan olarak aynı satırdaki hücreleri BOŞLUKSUZ birleştirir ("TYT400,942.900…").
// Şablonlar buna göre yazıldı. Sıralama tabloları gibi hücrelerin ayrı kalması gereken yerler için
// ikinci bir okuma yapılır: aynı satırdaki parçalar boşlukla ayrılır.
// Aynı okumada tüm metin parçalarının konumu (x, y, genişlik) da toplanır; iki sütunlu karneler
// ve sıralama tabloları gibi yerlerde en güvenilir okuma konuma göre yapılır.
// Doğru/yanlış bilgisi yalnızca hücre rengiyle verilen cevap çizelgelerinde (rects verilirse) çizelge içeren
// sayfaların renkli kutuları da aynı okumada toplanır.
function makeSpacedRender(items: PdfItem[], rects?: FillRect[], rectErrors?: string[]) {
  let page = 0;
  return (pageData: any) => {
    page++;
    const pageNo = page;
    return pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then((tc: any) => {
        let lastY: number | undefined;
        let text = '';
        for (const item of tc.items) {
          const y = item.transform[5];
          if (lastY === undefined) text += item.str;
          else if (lastY === y) text += ' ' + item.str;
          else text += '\n' + item.str;
          lastY = y;
          items.push({ page: pageNo, x: item.transform[4], y, w: Number(item.width) || 0, str: String(item.str ?? '').normalize('NFC') });
        }
        if (!rects || !/Ç[İI]ZELGES[İI]/.test(text)) return text;
        return collectFillRects(pageData, pageNo)
          .then((r) => { rects.push(...r); })
          .catch((e: unknown) => { rectErrors?.push(e instanceof Error ? e.message : String(e)); })
          .then(() => text);
      });
  };
}

export async function readPdfTexts(
  buffer: Buffer,
): Promise<{ text: string; spaced: string; items: PdfItem[]; rects: FillRect[]; itemsError?: string }> {
  const pdfParse = (await import('pdf-parse')).default as any;
  const base = await pdfParse(buffer);
  let spaced = '';
  let itemsError: string | undefined;
  const items: PdfItem[] = [];
  // Renkli cevap çizelgesi varsa kutu renkleri de okunur (yazı tipi yüklemesi kapatılarak; bkz. readPdfFillRects)
  const wantRects = /CEVAP\s*Ç[İI]ZELGES[İI]/.test(base.text ?? '') && disablePdfFontFace();
  const rects: FillRect[] = [];
  const rectErrors: string[] = [];
  try {
    const sp = await pdfParse(buffer, { pagerender: makeSpacedRender(items, wantRects ? rects : undefined, rectErrors) });
    spaced = sp.text ?? '';
  } catch (e) {
    itemsError = e instanceof Error ? e.message : String(e);
    spaced = ''; // boşluklu okuma başarısız olursa yalnızca varsayılan metinle devam edilir
    items.length = 0;
    rects.length = 0;
  }
  if (rectErrors.length) itemsError = (itemsError ? itemsError + ' · ' : '') + 'renk: ' + rectErrors[0];
  return { text: base.text ?? '', spaced, items, rects, itemsError };
}