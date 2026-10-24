import type { PdfItem } from './items';
/** Karnedeki konu/kazanım analizi satırı (bir soru) */
export interface ExamQuestion {
  s: string;          // ders anahtarı (turkce, matematik, tarih, …)
  n: number;          // soru no (ders tablosu içinde)
  k: string;          // konu / kazanım adı
  dc: string;         // doğru cevap
  oc: string | null;  // öğrenci cevabı (boş bıraktıysa null)
  r: 'D' | 'Y' | 'B'; // doğru / yanlış / boş
}

/** Sıralamalar. Anahtarlar PDF'teki sütunlardan gelir: genel, kurum, sube, sinif, il, ilce, osym23… */
export type ExamRankings = { katilimci?: Record<string, number> } & Record<string, number | Record<string, number> | undefined>;

export interface ExtractedPdfRecord {
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  // Aşağıdakiler isteğe bağlı (eski şablonlar vermez)
  puan?: number;
  questions?: ExamQuestion[]; // konu/kazanım analizi (varsa)
  averages?: Record<string, number>; // ders ortalamaları (ORT sütunu): turkce, matematik, …, sosyal, fen, toplam
  rankings?: ExamRankings; // genel/kurum/şube/sınıf/ÖSYM… sıralamaları
  examName?: string | null; // kayıt başına deneme adı (tek öğrencili karnelerde)
  examDate?: string | null; // YYYY-MM-DD
  examType?: PdfExamType; // bir PDF'te birden çok sınav türü varsa (TYT + AYT) kaydın kendi türü
  puanlar?: Record<string, number>; // AYT: say / ea / soz puanları
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
  canParse: (text: string, items?: PdfItem[]) => boolean;
  /** text: pdf-parse'ın varsayılan (bitişik) çıktısı · spaced: hücreleri boşlukla ayıran çıktı (varsa) */
  parse: (text: string, spaced?: string, items?: PdfItem[]) => PdfParseResult;
}