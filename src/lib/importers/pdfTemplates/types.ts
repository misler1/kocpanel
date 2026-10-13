export interface ExtractedPdfRecord {
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  // Aşağıdakiler isteğe bağlı (eski şablonlar vermez)
  puan?: number;
  examName?: string | null; // kayıt başına deneme adı (tek öğrencili karnelerde)
  examDate?: string | null; // YYYY-MM-DD
}

export interface PdfParseResult {
  examName: string | null;
  examDate: string | null;
  records: ExtractedPdfRecord[];
}

export type PdfExamType = 'TYT' | 'AYT' | 'LGS';

export interface PdfTemplate {
  id: string;           // örn. 'konu-analizli-sinav-sonuc-belgesi'
  label: string;        // koça gösterilecek isim
  examType?: PdfExamType; // verilmezse LGS varsayılır (ilk şablon)
  canParse: (text: string) => boolean;
  parse: (text: string) => PdfParseResult;
}