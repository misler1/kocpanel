import { konuAnalizliSinavSonucuTemplate } from './konuAnalizliSinavSonucu';
import { tytSiraliListeTemplate } from './tytSiraliListe';
import { tytTekKarneTemplate } from './tytTekKarne';
import { tytAytBirlesikKarneTemplate } from './tytAytBirlesikKarne';
import type { PdfItem } from './items';
import type { PdfTemplate, PdfParseResult, PdfExamType } from './types';

export type { PdfTemplate, PdfParseResult, PdfExamType } from './types';

const TEMPLATES: PdfTemplate[] = [
  tytAytBirlesikKarneTemplate, // iki sütunlu TYT+AYT karnesi, tek öğrenci karnesinden önce denenmeli
  tytSiraliListeTemplate,
  tytTekKarneTemplate,
  konuAnalizliSinavSonucuTemplate,
  // yeni şablonlar buraya eklenecek
];

export function parsePdfWithTemplates(
  text: string,
  spaced?: string,
  items?: PdfItem[],
): { result: PdfParseResult; templateId: string; examType: PdfExamType } {
  for (const t of TEMPLATES) {
    if (!t.canParse(text, items)) continue;
    const result = t.parse(text, spaced, items);
    if (result.records.length === 0) {
      // İki sütunlu TYT+AYT karnesi tanındıysa ama okunamadıysa, yanlış şablona düşüp hatalı veri üretme
      if (t.id === tytAytBirlesikKarneTemplate.id) throw new Error('UNKNOWN_FORMAT');
      continue;
    }
    return { result, templateId: t.id, examType: t.examType ?? 'LGS' };
  }
  throw new Error('UNKNOWN_FORMAT');
}