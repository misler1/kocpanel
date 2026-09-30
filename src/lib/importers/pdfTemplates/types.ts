// src/lib/importers/pdfTemplates/types.ts
export interface ExtractedPdfRecord {
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
}

export interface PdfParseResult {
  examName: string | null;
  examDate: string | null;
  records: ExtractedPdfRecord[];
}

export interface PdfTemplate {
  id: string;           // örn. 'konu-analizli-sinav-sonuc-belgesi'
  label: string;        // koça gösterilecek isim, örn. "YETEV / Konu Analizli Sınav Sonuç Belgesi"
  canParse: (text: string) => boolean;
  parse: (text: string) => PdfParseResult;
}