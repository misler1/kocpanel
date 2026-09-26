import * as XLSX from 'xlsx';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, type SubjectDef } from '@/app/denemeler/examConstants';

function subjectsFor(examType: 'TYT' | 'AYT' | 'LGS'): SubjectDef[] {
  return examType === 'TYT' ? TYT_SUBJECTS : examType === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '').toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

// Ders grubu etiketlerini bizim subject key'lerimize eşler
const SUBJECT_LABEL_TO_KEY: Record<string, string> = {
  turkce: 'turkce',
  matematik: 'matematik',
  fenbilimleri: 'fen',
  fenbilgisi: 'fen',
  fen: 'fen',
  inkilap: 'inkilap',
  inkilaptarihi: 'inkilap',
  dinkulturu: 'din',
  dinkulturuveahlakbilgisi: 'din',
  din: 'din',
  ingilizce: 'ingilizce',
  yabancidil: 'ingilizce',
};

const NAME_HEADER_CANDIDATES = ['isim', 'adisoyadi', 'adsoyad', 'ogrenci', 'ogrenciadi', 'ad'];
const SURNAME_HEADER_CANDIDATES = ['soyad', 'ogrencisoyadi', 'soyadi'];

export interface ParsedExcelRow {
  rowIndex: number;
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  puan?: number;
}

export interface ExcelColumnMapping {
  format: 'grouped' | 'flat';
  headerRowCount: number; // 1 veya 2 (veri kaçıncı satırdan başlıyor)
  nameColumns: number[];
  subjectColumns: Record<string, { dogruCol?: number; yanlisCol?: number }>;
  puanColumn?: number;
  detected: boolean;
}

// ── İki satırlı gruplu başlık: üstte ders adı (merge), altta D/Y/BOŞ/NET ──
// D/Y sütunları bu formatta gerçek boolean (true/false) değer taşıyor.
function tryDetectGroupedHeader(
  row1: any[],
  row2: any[],
  examType: 'TYT' | 'AYT' | 'LGS'
): ExcelColumnMapping | null {
  const subjects = subjectsFor(examType);
  const validKeys = new Set(subjects.map((s) => s.key));

  // Merge edilmiş hücreler boş göründüğü için grup etiketini sağa doğru taşı
  const groupLabels: string[] = [];
  let current = '';
  for (let c = 0; c < row1.length; c++) {
    const v = row1[c];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      current = normalizeHeader(v);
    }
    groupLabels[c] = current;
  }

  const subjectColumns: ExcelColumnMapping['subjectColumns'] = {};
  let foundAny = false;

  for (let c = 0; c < row2.length; c++) {
    const sub = row2[c];
    const groupKey = SUBJECT_LABEL_TO_KEY[groupLabels[c]];
    if (!groupKey || !validKeys.has(groupKey)) continue;

    if (sub === true) {
      subjectColumns[groupKey] = { ...subjectColumns[groupKey], dogruCol: c };
      foundAny = true;
    } else if (sub === false) {
      subjectColumns[groupKey] = { ...subjectColumns[groupKey], yanlisCol: c };
      foundAny = true;
    }
  }

  if (!foundAny) return null;

  const normRow2 = row2.map(normalizeHeader);
  const nameCol = normRow2.findIndex((h) => NAME_HEADER_CANDIDATES.includes(h));
  const surnameCol = normRow2.findIndex((h) => SURNAME_HEADER_CANDIDATES.includes(h));
  const nameColumns: number[] = [];
  if (nameCol !== -1) nameColumns.push(nameCol);
  if (surnameCol !== -1) nameColumns.push(surnameCol);
  if (nameColumns.length === 0) nameColumns.push(1); // hiçbiri bulunamazsa 2. sütunu dene

  const puanColumn = normRow2.findIndex((h) => h.includes('puan'));

  return {
    format: 'grouped',
    headerRowCount: 2,
    nameColumns,
    subjectColumns,
    puanColumn: puanColumn !== -1 ? puanColumn : undefined,
    detected: true,
  };
}

// ── Tek satırlı düz başlık (eski format, fallback) ──
function tryDetectFlatHeader(headers: string[], examType: 'TYT' | 'AYT' | 'LGS'): ExcelColumnMapping {
  const subjects = subjectsFor(examType);
  const normHeaders = headers.map(normalizeHeader);

  const nameColumn = normHeaders.findIndex((h) => NAME_HEADER_CANDIDATES.includes(h));

  const subjectColumns: ExcelColumnMapping['subjectColumns'] = {};
  let foundAny = false;

  for (const s of subjects) {
    const labelNorm = normalizeHeader(s.label);
    const dogruCol = normHeaders.findIndex(
      (h) => h.startsWith(labelNorm) && (h.endsWith('d') || h.includes('dogru'))
    );
    const yanlisCol = normHeaders.findIndex(
      (h) => h.startsWith(labelNorm) && (h.endsWith('y') || h.includes('yanlis'))
    );
    if (dogruCol !== -1 || yanlisCol !== -1) {
      foundAny = true;
      subjectColumns[s.key] = {
        dogruCol: dogruCol !== -1 ? dogruCol : undefined,
        yanlisCol: yanlisCol !== -1 ? yanlisCol : undefined,
      };
    }
  }

  const puanColumn = normHeaders.findIndex((h) => h.includes('puan'));

  return {
    format: 'flat',
    headerRowCount: 1,
    nameColumns: [nameColumn !== -1 ? nameColumn : 0],
    subjectColumns,
    puanColumn: puanColumn !== -1 ? puanColumn : undefined,
    detected: nameColumn !== -1 && foundAny,
  };
}

export function parseExcelBuffer(
  buffer: ArrayBuffer,
  examType: 'TYT' | 'AYT' | 'LGS',
  manualMapping?: ExcelColumnMapping
): { headers: string[]; rows: ParsedExcelRow[]; mapping: ExcelColumnMapping } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  let mapping: ExcelColumnMapping;
  if (manualMapping) {
    mapping = manualMapping;
  } else {
    const grouped = tryDetectGroupedHeader(data[0] ?? [], data[1] ?? [], examType);
    mapping = grouped ?? tryDetectFlatHeader((data[0] ?? []).map(String), examType);
  }

  const startRow = mapping.headerRowCount;
  const displayHeaders = (data[mapping.headerRowCount - 1] ?? []).map(String);

  const rows: ParsedExcelRow[] = [];
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    const rawName = mapping.nameColumns
      .map((c) => String(row[c] ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!rawName) continue;

    const results: ParsedExcelRow['results'] = {};
    for (const [subjectKey, cols] of Object.entries(mapping.subjectColumns)) {
      const dogru = cols.dogruCol != null ? String(row[cols.dogruCol] ?? '') : '';
      const yanlis = cols.yanlisCol != null ? String(row[cols.yanlisCol] ?? '') : '';
      if (dogru !== '' || yanlis !== '') {
        results[subjectKey] = { dogru, yanlis };
      }
    }

    const puan = mapping.puanColumn != null ? Number(row[mapping.puanColumn]) || undefined : undefined;

    rows.push({ rowIndex: i, rawName, results, puan });
  }

  return { headers: displayHeaders, rows, mapping };
}