import type { ExtractedPdfRecord } from './types';

/** 34,5 → "34,50" ; tamsayı da 2 ondalıkla ("5" → "5,00"). Net sütunları hep 2 ondalık yazılıyor. */
export function fmtNet(n: number): string {
  const s = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  return s === '-0,00' ? '0,00' : s;
}

export const netYKS = (d: number, y: number) => d - y / 4;

export function trDateToIso(s: string | undefined | null): string | null {
  const m = s?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export const trUpper = (s: string) => s.toLocaleUpperCase('tr-TR');

export type DY = { d: number; y: number };

export function toResults(map: Record<string, DY>): ExtractedPdfRecord['results'] {
  const out: ExtractedPdfRecord['results'] = {};
  for (const [k, v] of Object.entries(map)) out[k] = { dogru: String(v.d), yanlis: String(v.y) };
  return out;
}