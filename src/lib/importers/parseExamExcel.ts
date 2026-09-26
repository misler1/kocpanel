// src/lib/importers/parseExamExcel.ts
import * as XLSX from 'xlsx';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, type SubjectDef } from '@/app/denemeler/examConstants';
// ↑ examConstants.ts'in gerçek yolunu kendi projene göre düzelt

function subjectsFor(examType: 'TYT' | 'AYT' | 'LGS'): SubjectDef[] {
  return examType === 'TYT' ? TYT_SUBJECTS : examType === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
}

function normalizeHeader(h: string): string {
  return (h ?? '').toString().toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

const NAME_HEADER_CANDIDATES = ['isim', 'adisoyadi', 'adsoyad', 'ogrenci', 'ogrenciadi', 'ad'];

export interface ParsedExcelRow {
  rowIndex: number;
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  puan?: number;
}

export interface ExcelColumnMapping {
  nameColumn: number;
  // subjectKey -> { dogruCol?, yanlisCol?, netCol? } (netCol varsa dogru/yanlis'tan net hesaplamak yerine direkt kullanılabilir ama şu an sadece D/Y okuyoruz)
  subjectColumns: Record<string, { dogruCol?: number; yanlisCol?: number }>;
  puanColumn?: number;
  detected: boolean; // otomatik mi bulundu, yoksa manuel mi eşleştirilecek
}

// Başlık satırından otomatik sütun eşleştirme dener.
// Beklenen desen: "<Ders> D", "<Ders> Y" ya da "<Ders> Doğru", "<Ders> Yanlış"
export function autoDetectColumns(headers: string[], examType: 'TYT' | 'AYT' | 'LGS'): ExcelColumnMapping {
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
    nameColumn: nameColumn !== -1 ? nameColumn : 0,
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
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headers = (data[0] ?? []).map((h) => String(h));
  const mapping = manualMapping ?? autoDetectColumns(headers, examType);

  const rows: ParsedExcelRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rawName = String(row[mapping.nameColumn] ?? '').trim();
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

  return { headers, rows, mapping };
}