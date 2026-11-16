import type { PdfTemplate, ExtractedPdfRecord, ExamRankings } from './types';
import { mergeAdjacent, type PdfItem } from './items';
import { trDateToIso, trUpper, toResults, type DY } from './shared';
import { parseKazanimTable, expandKazanim, sumBySubject } from './kazanimTablosu';

// ───────────────────────── Şablon: AKBİM "SINAV SONUÇ BELGESİ" (TYT, sayfa başına bir öğrenci) ─────────────────────────
// Üst bilgi: MEB KODU · ŞUBE · ÖĞR.NO · TC NO · SOYADI - ADI · SINAV ADI · TARİH
// DERSLER tablosu: TÜRKÇE · SOSYAL · T. MAT · FEN (+ AYT testleri) için soru / doğru / yanlış / boş / net / sınav net ort.
// PUANLAR + DERECELER: TÜRKİYE / İL / İLÇE / KURUM / ŞUBE sıraları; "TESTE GÖRE ÖĞRENCİ SAYILARI" (katılımcı)
// KONU ADI · SS · D · Y · %: üç sütunlu kazanım tablosu (TÜRKÇE, TAR-1, COĞ-1, FEL-1, DİN-1, T. MAT, GEO-1, FİZ-1, KİM-1, BİY-1).
//   Ders bazındaki doğru/yanlışlar bu tablodan toplanır (üst tablo sosyal ve feni bölmüyor, T. MAT'a geometri dahil).
//   Hiç cevap verilmeyen dersin bölümü tabloda yer almaz.

const RESULT_KEYS = ['turkce', 'tarih', 'cografya', 'felsefe', 'din', 'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];

function sectionOf(label: string): string | null {
  const u = trUpper(label).replace(/\s+/g, '');
  if (/^T[ÜU]RK[ÇC]E$/.test(u)) return 'turkce';
  if (/^TAR(-?\d)?$/.test(u)) return 'tarih';
  if (/^CO[ĞG](-?\d)?$/.test(u)) return 'cografya';
  if (/^FEL(-?\d)?$/.test(u)) return 'felsefe';
  if (/^D[İI]N(-?\d)?$/.test(u)) return 'din';
  if (/^T\.?MAT$/.test(u)) return 'matematik';
  if (/^GEO(-?\d)?$/.test(u)) return 'geometri';
  if (/^F[İI]Z(-?\d)?$/.test(u)) return 'fizik';
  if (/^K[İI]M(-?\d)?$/.test(u)) return 'kimya';
  if (/^B[İI]Y(-?\d)?$/.test(u)) return 'biyoloji';
  return null;
}

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return parseInt(t.replace(/\./g, ''), 10); // 30.488
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+,\d+$/.test(t)) return parseFloat(t.replace(',', '.'));
  return null;
};

const cx = (i: PdfItem) => i.x + i.w / 2;
const sameRow = (a: PdfItem, b: PdfItem, tol = 2) => Math.abs(a.y - b.y) <= tol;

const RANK_ROWS: [RegExp, string][] = [
  [/^T[ÜU]RK[İI]YE$/, 'genel'],
  [/^[İI]L$/, 'il'],
  [/^[İI]L[ÇC]E$/, 'ilce'],
  [/^KURUM$/, 'kurum'],
  [/^ŞUBE$/, 'sube'],
];

function parsePage(raw: PdfItem[]): ExtractedPdfRecord | null {
  const items = mergeAdjacent(raw).filter((i) => i.str.trim() !== '');
  const find = (re: RegExp) => items.find((i) => re.test(i.str.trim()));

  // Üst bilgi: başlıkların hemen altındaki satırda, başlığa en yakın hücre
  const hName = find(/^SOYADI\s*-\s*ADI$/);
  const hExam = find(/^SINAV ADI$/);
  if (!hName) return null;
  const below = items.filter((i) => i.y < hName.y - 4 && i.y > hName.y - 20);
  const closest = (h: PdfItem | undefined) => {
    if (!h) return null;
    let best: PdfItem | null = null;
    for (const i of below) if (!best || Math.abs(cx(i) - cx(h)) < Math.abs(cx(best) - cx(h))) best = i;
    return best && Math.abs(cx(best) - cx(h)) < 90 ? best : null;
  };
  const nameItem = closest(hName);
  const rawName = nameItem?.str.replace(/\s+/g, ' ').trim() ?? '';
  if (!rawName || /\*/.test(rawName)) return null;
  const examItem = closest(hExam);
  const examName = examItem && examItem !== nameItem ? examItem.str.replace(/\s+/g, ' ').trim() : null;
  const examDate = trDateToIso(below.find((i) => /\d{1,2}\.\d{1,2}\.\d{4}/.test(i.str))?.str);

  // DERSLER tablosu: yalnızca TYT testleri (TÜRKÇE, SOSYAL, T. MAT, FEN)
  const hDers = find(/^DERSLER$/);
  if (!hDers) return null;
  const colX = (re: RegExp) => items.find((i) => sameRow(i, hDers) && re.test(trUpper(i.str.trim()).replace(/\s+/g, '')))?.x;
  const cTur = colX(/^T[ÜU]RK[ÇC]E$/);
  const cMat = colX(/^T\.?MAT$/);
  if (cTur === undefined || cMat === undefined) return null; // TYT karnesi değil
  const rowVal = (labelRe: RegExp, x: number | undefined) => {
    const lab = find(labelRe);
    if (!lab || x === undefined) return null;
    const v = items.find((i) => sameRow(i, lab) && i.x > lab.x + 20 && Math.abs(i.x - x) < 12);
    return v ? toNum(v.str) : null;
  };
  const head = {
    turkce: { d: rowVal(/^DOĞRU CEVAP$/, cTur), y: rowVal(/^YANLIŞ CEVAP$/, cTur) },
    tmat: { d: rowVal(/^DOĞRU CEVAP$/, cMat), y: rowVal(/^YANLIŞ CEVAP$/, cMat) },
  };
  const averages: Record<string, number> = {};
  const ortTur = rowVal(/^SINAV NET ORT\.?$/, cTur);
  if (ortTur !== null) averages.turkce = ortTur;
  const cSos = colX(/^SOSYAL$/);
  const cFen = colX(/^FEN$/);
  const ortSos = rowVal(/^SINAV NET ORT\.?$/, cSos);
  const ortFen = rowVal(/^SINAV NET ORT\.?$/, cFen);
  if (ortSos !== null) averages.sosyal = ortSos;
  if (ortFen !== null) averages.fen = ortFen;

  // Puan ve sıralamalar: PUANLAR tablosundaki "TYT" sütunu; katılımcılar "TESTE GÖRE ÖĞRENCİ SAYILARI"nın "TYT" sütunu
  const tyts = items.filter((i) => i.str.trim() === 'TYT');
  const hPuanTyt = tyts.find((t) => items.some((i) => sameRow(i, t) && /^SAY$/.test(i.str.trim())));
  const hKatTyt = tyts.find((t) => items.some((i) => sameRow(i, t) && /^MAT$/.test(i.str.trim())) && (!hPuanTyt || t.x > hPuanTyt.x + 60));
  let puan: number | undefined;
  if (hPuanTyt) {
    const p = items.find((i) => i.y < hPuanTyt.y - 2 && i.y > hPuanTyt.y - 25 && Math.abs(cx(i) - cx(hPuanTyt)) < 30 && /^\d{1,3},\d{2,3}$/.test(i.str.trim()));
    if (p) puan = toNum(p.str) ?? undefined;
  }
  const rankings: ExamRankings = {};
  const katilimci: Record<string, number> = {};
  for (const [re, key] of RANK_ROWS) {
    const lab = items.find((i) => i.x < 60 && re.test(i.str.trim()) && (!hPuanTyt || i.y < hPuanTyt.y));
    if (!lab) continue;
    const row = items.filter((i) => sameRow(i, lab, 2.5) && i !== lab);
    if (hPuanTyt) {
      const r = row.find((i) => Math.abs(cx(i) - cx(hPuanTyt)) < 30 && i.x < (hKatTyt?.x ?? Infinity) - 40);
      const v = r ? toNum(r.str) : null;
      if (v !== null && v > 0) rankings[key] = v;
    }
    if (hKatTyt) {
      const k = row.find((i) => Math.abs(cx(i) - cx(hKatTyt)) < 18);
      const v = k ? toNum(k.str) : null;
      if (v !== null && v > 0) katilimci[key] = v;
    }
  }
  if (Object.keys(katilimci).length && Object.keys(rankings).length) rankings.katilimci = katilimci;

  // Kazanım tablosu → ders sonuçları
  const kaz = parseKazanimTable(raw, sectionOf);
  const sums = sumBySubject(kaz);
  const map: Record<string, DY> = {};
  for (const k of RESULT_KEYS) map[k] = { d: sums[k]?.d ?? 0, y: sums[k]?.y ?? 0 };
  // Türkçe ve matematik üst tablodan: iptal edilen sorular (cevap anahtarında "T") orada herkese doğru sayılıyor,
  // kazanım tablosunda sayılmıyor. Matematik = T. MAT (geometri dahil) − geometri.
  if (head.turkce.d !== null && head.turkce.y !== null) map.turkce = { d: head.turkce.d, y: head.turkce.y };
  if (kaz.length && head.tmat.d !== null && head.tmat.y !== null) {
    map.matematik = { d: Math.max(0, head.tmat.d - map.geometri.d), y: Math.max(0, head.tmat.y - map.geometri.y) };
  }
  if (!kaz.length) {
    // Kazanım tablosu yoksa yalnızca üst tablodaki Türkçe ve matematik (geometri dahil) alınabilir
    if (head.turkce.d !== null) map.turkce = { d: head.turkce.d, y: head.turkce.y ?? 0 };
    if (head.tmat.d !== null) map.matematik = { d: head.tmat.d, y: head.tmat.y ?? 0 };
  }
  const total = Object.values(map).reduce((a, v) => a + v.d + v.y, 0);
  if (total === 0 && !puan) return null; // sınava girmemiş

  const questions = expandKazanim(kaz);
  return {
    rawName,
    examName,
    examDate,
    examType: 'TYT',
    results: toResults(map),
    ...(puan ? { puan } : {}),
    ...(questions.length ? { questions } : {}),
    ...(Object.keys(averages).length ? { averages } : {}),
    ...(Object.keys(rankings).length ? { rankings } : {}),
  };
}

export const akbimTytKarneTemplate: PdfTemplate = {
  id: 'akbim-tyt-karne',
  label: 'TYT – Sınav sonuç belgesi (kazanım tablolu, Türkiye sıralamalı)',
  examType: 'TYT',
  canParse: (t) =>
    /SINAV SONUÇ BELGES[İI]/.test(t) && /KONU ADI/.test(t) && /TESTE GÖRE ÖĞRENC[İI] SAYILARI/.test(t) && /DERECELER/.test(t),
  parse: (_t, _spaced, items) => {
    if (!items?.length) return { examName: null, examDate: null, records: [] };
    const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
    const records: ExtractedPdfRecord[] = [];
    for (const p of pages) {
      const rec = parsePage(items.filter((i) => i.page === p));
      if (rec) records.push(rec);
    }
    return { examName: records[0]?.examName ?? null, examDate: records[0]?.examDate ?? null, records };
  },
};
