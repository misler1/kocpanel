export interface ExtractedPdfRecord {
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
}

export interface PdfParseResult {
  examName: string | null;
  examDate: string | null; // YYYY-MM-DD
  records: ExtractedPdfRecord[];
}

// DERSLER tablosundaki etiketleri bizim LGS_SUBJECTS key'lerine eşler.
// Sıra bu şablonda sabit: Türkçe, İnkılap, Din Kültürü, Yabancı Dil, Matematik, Fen Bilimleri
const SUBJECT_PATTERNS: { key: string; label: RegExp }[] = [
  { key: 'turkce', label: /Türkçe/ },
  { key: 'inkilap', label: /İnkılap Tarihi.*Atatürkçülük|İnkılap Tarihi/ },
  { key: 'din', label: /Din Kültürü.*Ahlak Bilgisi|Din Kültürü/ },
  { key: 'ingilizce', label: /Yabancı Dil/ },
  { key: 'matematik', label: /^Matematik\b/m },
  { key: 'fen', label: /Fen Bilimleri/ },
];

// Bir satırdaki "Soru Yanlış Doğru Net Başarı%" beşlisini yakalar
// örn: "20 18 2 17,33 86,65"  ya da  "10 10 0 10 100"
const NUMBERS_AFTER_LABEL = /\s+(\d+)\s+(\d+)\s+(\d+)\s+(-?[\d,]+)\s+(-?[\d,]+)/;

function turkishDateToIso(d: string): string | null {
  // "3.08.2026" -> "2026-08-03"
  const m = d.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, day, month, year] = m;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parsePdfExamText(fullText: string): PdfParseResult {
  // Her öğrenci bloğu "Öğrenci Adı" ile başlar
  const blocks = fullText.split(/(?=Öğrenci Adı)/g).filter((b) => b.includes('Öğrenci Adı'));

  const records: ExtractedPdfRecord[] = [];
  let examName: string | null = null;
  let examDate: string | null = null;

  for (const block of blocks) {
    const nameMatch = block.match(/Öğrenci Adı\s+([^\n]+?)\s+Numara/);
    if (!nameMatch) continue;
    const rawName = nameMatch[1].trim();

    if (!examName) {
      const examMatch = block.match(/Sınav Adı\s+([\s\S]*?)\s+Alan/);
      if (examMatch) examName = examMatch[1].replace(/\s+/g, ' ').trim();
    }
    if (!examDate) {
      const dateMatch = block.match(/Sınav Tarihi\s+(\d{1,2}\.\d{1,2}\.\d{4})/);
      if (dateMatch) examDate = turkishDateToIso(dateMatch[1]);
    }

    const results: ExtractedPdfRecord['results'] = {};
    for (const { key, label } of SUBJECT_PATTERNS) {
      // Etiketten sonraki ilk 5-sayı grubunu ara (aynı satırda ya da hemen ardından)
      const labelMatch = block.match(label);
      if (!labelMatch || labelMatch.index == null) continue;
      const afterLabel = block.slice(labelMatch.index + labelMatch[0].length, labelMatch.index + labelMatch[0].length + 60);
      const numMatch = afterLabel.match(NUMBERS_AFTER_LABEL);
      if (!numMatch) continue;
      const [, , dogru, yanlis] = numMatch; // soru sayısı, doğru, yanlış, net, başarı
      results[key] = { dogru, yanlis };
    }

    if (Object.keys(results).length > 0) {
      records.push({ rawName, results });
    }
  }

  return { examName, examDate, records };
}