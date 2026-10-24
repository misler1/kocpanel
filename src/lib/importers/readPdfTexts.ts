/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PdfItem } from './pdfTemplates/items';

// pdf-parse varsayılan olarak aynı satırdaki hücreleri BOŞLUKSUZ birleştirir ("TYT400,942.900…").
// Şablonlar buna göre yazıldı. Sıralama tabloları gibi hücrelerin ayrı kalması gereken yerler için
// ikinci bir okuma yapılır: aynı satırdaki parçalar boşlukla ayrılır.
// Aynı okumada tüm metin parçalarının konumu (x, y, genişlik) da toplanır; iki sütunlu karneler
// ve sıralama tabloları gibi yerlerde en güvenilir okuma konuma göre yapılır.
function makeSpacedRender(items: PdfItem[]) {
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
        return text;
      });
  };
}

export async function readPdfTexts(buffer: Buffer): Promise<{ text: string; spaced: string; items: PdfItem[]; itemsError?: string }> {
  const pdfParse = (await import('pdf-parse')).default as any;
  const base = await pdfParse(buffer);
  let spaced = '';
  let itemsError: string | undefined;
  const items: PdfItem[] = [];
  try {
    const sp = await pdfParse(buffer, { pagerender: makeSpacedRender(items) });
    spaced = sp.text ?? '';
  } catch (e) {
    itemsError = e instanceof Error ? e.message : String(e);
    spaced = ''; // boşluklu okuma başarısız olursa yalnızca varsayılan metinle devam edilir
    items.length = 0;
  }
  return { text: base.text ?? '', spaced, items, itemsError };
}