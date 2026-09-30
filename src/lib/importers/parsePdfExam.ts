import type { ExtractedPdfRecord, PdfParseResult } from './pdfTemplates/types';

// "Konu Analizli Sınav Sonuç Belgesi" formatındaki DERSLER tablosu — sıra ve soru sayıları sabit.
// pdf-parse bu tablodaki sayıları boşluksuz bitişik yazıyor (örn. "2018217,3386,65" =
// Soru 20, Doğru 18, Yanlış 2, Net 17,33, Başarı% 86,65), bu yüzden düz regex yetmiyor;
// aşağıdaki splitGluedNumbers ile calcNetLGS formülünü kullanarak doğru/yanlış kombinasyonunu buluyoruz.
const SUBJECT_DEFS: { key: string; label: RegExp; maxSoru: number }[] = [
  { key: 'turkce', label: /Türkçe/, maxSoru: 20 },
  { key: 'inkilap', label: /İnkılap Tarihi ve Atatürkçülük/, maxSoru: 10 },
  { key: 'din', label: /Din Kültürü ve Ahlak Bilgisi/, maxSoru: 10 },
  { key: 'ingilizce', label: /Yabancı Dil/, maxSoru: 10 },
  { key: 'matematik', label: /Matematik/, maxSoru: 20 },
  { key: 'fen', label: /Fen Bilimleri/, maxSoru: 20 },
];

function calcNetLGS(dogru: number, yanlis: number): number {
  const net = dogru - yanlis / 3;
  return Math.max(0, Math.round(net * 100) / 100);
}

function formatTrNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace('.', ',');
}

// Boşluksuz birleşik sayı bloğunu (örn. "2018217,3386,65") deneme-yanılma ile
// Doğru/Yanlış olarak ayırır. calcNetLGS ile aynı formülü kullandığı için üretilen
// aday string'ler PDF'teki gerçek değerlerle birebir örtüşüyor — tek bir kombinasyon eşleşir.
function splitGluedNumbers(token: string, maxSoru: number): { dogru: number; yanlis: number } | null {
  const soruStr = String(maxSoru);
  if (!token.startsWith(soruStr)) return null;
  const remainder = token.slice(soruStr.length);

  for (let dogru = 0; dogru <= maxSoru; dogru++) {
    for (let yanlis = 0; yanlis <= maxSoru - dogru; yanlis++) {
      const net = calcNetLGS(dogru, yanlis);
      const basari = Math.round((net / maxSoru) * 10000) / 100;
      const candidate = `${dogru}${yanlis}${formatTrNumber(net)}${formatTrNumber(basari)}`;
      if (candidate === remainder) {
        return { dogru, yanlis };
      }
    }
  }
  return null;
}

export function parsePdfExamText(fullText: string): PdfParseResult {
  // Her öğrenci bloğu "Öğrenci Adı" ile başlar
  const blocks = fullText.split(/(?=Öğrenci Adı)/g).filter((b) => b.includes('Öğrenci Adı'));

  const records: ExtractedPdfRecord[] = [];
  let examName: string | null = null;
  let examDate: string | null = null;

  for (const block of blocks) {
    // pdf-parse bazı etiketlerin etrafında boşluk bırakmıyor, bu yüzden \s* (sıfır veya daha fazla) kullanıyoruz
    const nameMatch = block.match(/Öğrenci Adı\s*([^\n]+?)\s*Numara/);
    if (!nameMatch) continue;
    const rawName = nameMatch[1].trim();

    if (!examName) {
      const examMatch = block.match(/Sınav Adı\s*([\s\S]*?)\s*Alan\b/);
      if (examMatch) examName = examMatch[1].replace(/\s+/g, ' ').trim();
    }
    if (!examDate) {
      const dateMatch = block.match(/Sınav Tarihi\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
      if (dateMatch) {
        const [d, m, y] = dateMatch[1].split('.');
        examDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }

    const results: ExtractedPdfRecord['results'] = {};
    for (const { key, label, maxSoru } of SUBJECT_DEFS) {
      const labelMatch = block.match(label);
      if (!labelMatch || labelMatch.index == null) continue;
      const afterLabel = block.slice(labelMatch.index + labelMatch[0].length);
      const tokenMatch = afterLabel.match(/^\s+(\S+)/);
      if (!tokenMatch) continue;
      const parsed = splitGluedNumbers(tokenMatch[1], maxSoru);
      if (!parsed) continue;
      results[key] = { dogru: String(parsed.dogru), yanlis: String(parsed.yanlis) };
    }

    if (Object.keys(results).length > 0) {
      records.push({ rawName, results });
    }
  }

  return { examName, examDate, records };
}