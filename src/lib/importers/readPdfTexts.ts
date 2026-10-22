/* eslint-disable @typescript-eslint/no-explicit-any */

// pdf-parse varsayılan olarak aynı satırdaki hücreleri BOŞLUKSUZ birleştirir ("TYT400,942.900…").
// Şablonlar buna göre yazıldı. Sıralama tabloları gibi hücrelerin ayrı kalması gereken yerler için
// ikinci bir okuma yapılır: aynı satırdaki parçalar boşlukla ayrılır.
const spacedRender = (pageData: any) =>
  pageData
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
      }
      return text;
    });

export async function readPdfTexts(buffer: Buffer): Promise<{ text: string; spaced: string }> {
  const pdfParse = (await import('pdf-parse')).default as any;
  const base = await pdfParse(buffer);
  let spaced = '';
  try {
    const sp = await pdfParse(buffer, { pagerender: spacedRender });
    spaced = sp.text ?? '';
  } catch {
    spaced = ''; // boşluklu okuma başarısız olursa yalnızca varsayılan metinle devam edilir
  }
  return { text: base.text ?? '', spaced };
}