import { konuAnalizliSinavSonucuTemplate } from './konuAnalizliSinavSonucu';
import { tytSiraliListeTemplate } from './tytSiraliListe';
import { tytTekKarneTemplate } from './tytTekKarne';
import type { PdfTemplate, PdfParseResult, PdfExamType } from './types';

export type { PdfTemplate, PdfParseResult, PdfExamType } from './types';

const TEMPLATES: PdfTemplate[] = [
  tytSiraliListeTemplate,
  tytTekKarneTemplate,
  konuAnalizliSinavSonucuTemplate,
  // yeni şablonlar buraya eklenecek
];

export function parsePdfWithTemplates(
  text: string,
  spaced?: string,
): { result: PdfParseResult; templateId: string; examType: PdfExamType } {
  for (const t of TEMPLATES) {
    if (!t.canParse(text)) continue;
    const result = t.parse(text, spaced);
    if (result.records.length === 0) continue;
    return { result, templateId: t.id, examType: t.examType ?? 'LGS' };
  }
  throw new Error('UNKNOWN_FORMAT');
}