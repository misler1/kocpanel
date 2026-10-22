import type { ExamRankings } from './types';

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
  return (spaced ? parseSpaced(spaced) : null) ?? parseSpaced(glued) ?? parseGluedPartial(glued) ?? undefined;
}