import type { ExamRankings } from './types';
import { tokenize, clusterRows, type PdfItem, type Row } from './items';

// "PUAN VE SIRALAMALAR" tablosu:
//   PUAN TÜRÜ  PUAN  GENEL  KURUM  SUBE  SİNİF  OSYM23  OSYM24  OSYM25
//   TYT        400,94 2.900  5      5     5      71.747  72.784  42.777
//   KATILIMCI SAYILARI  13663  17  17  17
// pdf-parse varsayılan çıktıda hücreleri bitiştirir ("TYT400,942.90055571.747…"); bu yüzden
// hücreleri boşlukla ayıran "spaced" metin (pagerender) tercih edilir, yoksa kısmi bir çözüm denenir.

const LABEL_KEYS: [RegExp, string][] = [
  [/^GENEL$/, 'genel'],
  [/^KURUM$/, 'kurum'],
  [/^[ŞS]UBE$/, 'sube'],
  [/^S[İI]N[İI]F$/, 'sinif'],
  [/^[İI]L[ÇC]E$/, 'ilce'],
  [/^[İI]L$/, 'il'],
  [/^OSYM\s?(\d{2})$/, 'osym'],
];

function labelKey(label: string): string {
  const up = label.toLocaleUpperCase('tr-TR');
  for (const [re, key] of LABEL_KEYS) {
    const m = up.match(re);
    if (m) return key === 'osym' ? `osym${m[1]}` : key;
  }
  return up.toLocaleLowerCase('en-US').replace(/[^a-z0-9]/g, '');
}

function toNum(tok: string): number | null {
  if (/^\d{1,3}(\.\d{3})+$/.test(tok)) return parseInt(tok.replace(/\./g, ''), 10); // 2.900 → 2900
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  if (/^\d+,\d+$/.test(tok)) return parseFloat(tok.replace(',', '.'));
  return null;
}

// Satır sonlarından bağımsız: bölümü tek bir parça (token) akışı olarak okur.
//   PUAN TÜRÜ PUAN GENEL KURUM SUBE SİNİF OSYM23 OSYM24 OSYM25 TYT 400,94 2.900 5 5 5 71.747 72.784 42.777 KATILIMCI SAYILARI 13663 17 17 17
function parseTokens(text: string): ExamRankings | null {
  const si = text.search(/PUAN\s+VE\s+SIRALAMALAR/i);
  if (si < 0) return null;
  const toks = text
    .slice(si)
    .replace(/PUAN\s+VE\s+SIRALAMALAR/i, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let i = toks.findIndex((t, k) => /^PUAN$/i.test(t) && /^T[ÜU]R[ÜU]$/i.test(toks[k + 1] ?? ''));
  if (i < 0) return null;
  i += 2;
  const labels: string[] = [];
  while (i < toks.length && /^(PUAN|GENEL|KURUM|[ŞS]UBE|S[İI]N[İI]F|[İI]L|[İI]L[ÇC]E|OSYM\s?\d{2})$/i.test(toks[i])) labels.push(toks[i++]);
  if (labels.length < 2) return null;
  i++; // puan türü (TYT / AYT / LGS…)
  const vals: number[] = [];
  while (i < toks.length && vals.length < labels.length) {
    const v = toNum(toks[i]);
    if (v === null) break;
    vals.push(v);
    i++;
  }
  if (vals.length !== labels.length) return null;
  const out: ExamRankings = {};
  labels.forEach((lab, j) => {
    const key = labelKey(lab);
    if (key !== 'puan') out[key] = vals[j];
  });
  while (i < toks.length && !/^KATILIMCI$/i.test(toks[i])) { if (/^SON$/i.test(toks[i])) return out; i++; }
  if (i < toks.length) {
    i++;
    if (/^SAYILARI$/i.test(toks[i] ?? '')) i++;
    const nums: number[] = [];
    while (i < toks.length) {
      const v = toNum(toks[i]);
      if (v === null) break;
      nums.push(v);
      i++;
    }
    const keys = labels.slice(1).map(labelKey).filter((k) => !k.startsWith('osym'));
    const kat: Record<string, number> = {};
    nums.forEach((n, j) => { if (keys[j]) kat[keys[j]] = n; });
    if (Object.keys(kat).length) out.katilimci = kat;
  }
  return out;
}

function parseSpaced(spaced: string): ExamRankings | null {
  const si = spaced.search(/PUAN VE SIRALAMALAR/);
  if (si < 0) return null;
  const lines = spaced
    .slice(si)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const hi = lines.findIndex((l) => /PUAN\s*T[ÜU]R[ÜU]/i.test(l));
  if (hi < 0) return null;
  const labels = lines[hi].replace(/PUAN\s*T[ÜU]R[ÜU]/i, '').trim().split(/\s+/); // PUAN GENEL KURUM …
  if (labels.length < 2) return null;

  const out: ExamRankings = {};
  for (let i = hi + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^KATILIMCI/i.test(line)) {
      const nums = line.replace(/^KATILIMCI\s*SAYILARI/i, '').trim().split(/\s+/).map(toNum).filter((n): n is number => n !== null);
      const keys = labels.slice(1).map(labelKey).filter((k) => !k.startsWith('osym'));
      const kat: Record<string, number> = {};
      nums.forEach((n, j) => { if (keys[j]) kat[keys[j]] = n; });
      if (Object.keys(kat).length) out.katilimci = kat;
      break;
    }
    if (/^SON\s+\d+\s+SINAV/i.test(line)) break;
    if (Object.keys(out).filter((k) => k !== 'katilimci').length) continue; // yalnızca ilk puan türü satırı
    const toks = line.split(/\s+/);
    const vals = toks.slice(1).map(toNum); // ilk sütun puan türü (TYT)
    if (vals.length !== labels.length || vals.some((v) => v === null)) continue;
    labels.forEach((lab, j) => {
      const key = labelKey(lab);
      if (key === 'puan') return;
      out[key] = vals[j] as number;
    });
  }
  // Yalnızca katılımcı sayısı çıktıysa (sıra değerleri okunamadıysa) güvenilir değil
  return Object.keys(out).some((k) => k !== 'katilimci') ? out : null;
}

// Yalnızca kesin çözülebilen alanlar: genel sıra (binlik noktalı) ve son iki ÖSYM değeri.
function parseGluedPartial(glued: string): ExamRankings | null {
  const si = glued.search(/PUAN VE SIRALAMALAR/);
  if (si < 0) return null;
  const m = glued.slice(si).match(/\n\s*[A-ZÇĞİÖŞÜ]{2,4}\s*\d{2,3},\d{2}(\d{1,3}(?:\.\d{3})*)(\d*)((?:\d{1,3}\.\d{3}){0,3})/);
  if (!m) return null;
  const out: ExamRankings = {};
  const genel = toNum(m[1]);
  if (genel !== null) out.genel = genel;
  const toks = (m[2] + m[3]).match(/\d{1,3}\.\d{3}/g) ?? [];
  if (toks.length >= 2) {
    const a = toNum(toks[toks.length - 1]);
    const b = toNum(toks[toks.length - 2]);
    if (a !== null) out.osym25 = a;
    if (b !== null) out.osym24 = b;
  }
  return Object.keys(out).length ? out : null;
}

export function parseRankings(glued: string, spaced?: string): ExamRankings | undefined {
  return (spaced ? parseTokens(spaced) ?? parseSpaced(spaced) : null) ?? parseTokens(glued) ?? parseSpaced(glued) ?? parseGluedPartial(glued) ?? undefined;
}

/**
 * Konuma dayalı okuma (en güvenilir yol): "PUAN VE SIRALAMALAR" tablosunu hücre konumlarından çözer.
 * puanTuru: hangi satır okunacak (TYT, SAY, EA, SÖZ…). Verilmezse ilk satır.
 */
export function parseRankingsFromItems(
  items: PdfItem[] | undefined,
  puanTuru?: string,
): { rankings: ExamRankings; puan: number | null } | null {
  if (!items?.length) return null;
  const toks = tokenize(items);
  const rows = clusterRows(toks, 3);
  const start = rows.findIndex((r) => /PUAN\s+VE\s+SIRALAMALAR/i.test(r.toks.map((t) => t.s).join(' ')));
  if (start < 0) return null;
  const sec: Row[] = [];
  for (let i = start + 1; i < rows.length && rows[i].page === rows[start].page; i++) {
    if (/^SON\b/i.test(rows[i].toks[0]?.s ?? '')) break;
    sec.push(rows[i]);
  }
  const hi = sec.findIndex((r) => /^PUAN$/i.test(r.toks[0]?.s) && /^T[ÜU]R[ÜU]$/i.test(r.toks[1]?.s ?? ''));
  if (hi < 0) return null;
  const labels = sec[hi].toks.slice(2).map((t) => ({ key: labelKey(t.s), x: t.x }));
  if (labels.length < 2) return null;

  const want = puanTuru ? puanTuru.toLocaleUpperCase('tr-TR') : null;
  const out: ExamRankings = {};
  let puan: number | null = null;
  let found = false;
  for (const r of sec.slice(hi + 1)) {
    const first = r.toks[0]?.s ?? '';
    if (/^KATILIMCI/i.test(first)) {
      const nums = r.toks.filter((t) => toNum(t.s) !== null);
      const cand = labels.filter((l) => l.key !== 'puan' && !l.key.startsWith('osym'));
      const kat: Record<string, number> = {};
      for (const t of nums) {
        let best = cand[0];
        for (const c of cand) if (Math.abs(c.x - t.x) < Math.abs(best.x - t.x)) best = c;
        if (best) kat[best.key] = toNum(t.s) as number;
      }
      if (Object.keys(kat).length) out.katilimci = kat;
      break;
    }
    if (found) continue;
    if (want && first.toLocaleUpperCase('tr-TR') !== want) continue;
    const vals = r.toks.slice(1).map((t) => toNum(t.s));
    if (vals.length !== labels.length || vals.some((v) => v === null)) continue;
    found = true;
    labels.forEach((l, j) => {
      if (l.key === 'puan') puan = vals[j] as number;
      else out[l.key] = vals[j] as number;
    });
  }
  return found ? { rankings: out, puan } : null;
}