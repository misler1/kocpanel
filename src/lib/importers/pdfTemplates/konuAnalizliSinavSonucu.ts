// src/lib/importers/pdfTemplates/konuAnalizliSinavSonucu.ts
import type { PdfTemplate } from './types';
import { parsePdfExamText } from '../parsePdfExam';

export const konuAnalizliSinavSonucuTemplate: PdfTemplate = {
  id: 'konu-analizli-sinav-sonuc-belgesi',
  label: 'Konu Analizli Sınav Sonuç Belgesi (D/Y birleşik format)',
  canParse: (text) => text.includes('KONU ANALİZLİ SINAV SONUÇ BELGESİ'),
  parse: parsePdfExamText,
};