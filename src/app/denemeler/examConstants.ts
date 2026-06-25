// ─── Ders tanımları ──────────────────────────────────────────

export interface SubjectDef {
  key: string;
  label: string;
  total: number;
  optional?: boolean; // Mat/Geo gibi birlikte max 40
  groupWith?: string; // hangi key ile grup oluşturuyor
}

export const TYT_SUBJECTS: SubjectDef[] = [
  { key: 'turkce', label: 'Türkçe', total: 40 },
  { key: 'tarih', label: 'Tarih', total: 5 },
  { key: 'cografya', label: 'Coğrafya', total: 5 },
  { key: 'felsefe', label: 'Felsefe', total: 5 },
  { key: 'din', label: 'Din Kültürü', total: 5 },
  { key: 'matematik', label: 'Matematik', total: 40, optional: true, groupWith: 'geometri' },
  { key: 'geometri', label: 'Geometri', total: 40, optional: true, groupWith: 'matematik' },
  { key: 'fizik', label: 'Fizik', total: 7 },
  { key: 'kimya', label: 'Kimya', total: 7 },
  { key: 'biyoloji', label: 'Biyoloji', total: 6 },
];

export const AYT_SUBJECTS: SubjectDef[] = [
  { key: 'edebiyat', label: 'Edebiyat', total: 24 },
  { key: 'tarih1', label: 'Tarih 1', total: 10 },
  { key: 'cografya1', label: 'Coğrafya 1', total: 6 },
  { key: 'tarih2', label: 'Tarih 2', total: 11 },
  { key: 'cografya2', label: 'Coğrafya 2', total: 11 },
  { key: 'felsefe_grubu', label: 'Felsefe Grubu', total: 12 },
  { key: 'din', label: 'Din Kültürü', total: 6 },
  { key: 'matematik', label: 'Matematik', total: 40, optional: true, groupWith: 'geometri' },
  { key: 'geometri', label: 'Geometri', total: 40, optional: true, groupWith: 'matematik' },
  { key: 'fizik', label: 'Fizik', total: 14 },
  { key: 'kimya', label: 'Kimya', total: 13 },
  { key: 'biyoloji', label: 'Biyoloji', total: 13 },
];

export const LGS_SUBJECTS: SubjectDef[] = [
  { key: 'turkce', label: 'Türkçe', total: 20 },
  { key: 'inkilap', label: 'İnkılap Tarihi', total: 10 },
  { key: 'din', label: 'Din Kültürü', total: 10 },
  { key: 'ingilizce', label: 'İngilizce', total: 10 },
  { key: 'matematik', label: 'Matematik', total: 20 },
  { key: 'fen', label: 'Fen Bilgisi', total: 20 },
];

// ─── Net hesaplama ────────────────────────────────────────────

// YKS: 4 yanlış = 1 doğru götürür
export function calcNetYKS(dogru: number, yanlis: number): number {
  const net = dogru - yanlis / 4;
  return Math.max(0, Math.round(net * 100) / 100);
}

// LGS: 3 yanlış = 1 doğru götürür
export function calcNetLGS(dogru: number, yanlis: number): number {
  const net = dogru - yanlis / 3;
  return Math.max(0, Math.round(net * 100) / 100);
}

// Mat+Geo toplam soru sayısı = 40 (TYT veya AYT için)
export function matGeoTotal(matDogru: number, matYanlis: number, geoDogru: number, geoYanlis: number): number {
  return matDogru + matYanlis + geoDogru + geoYanlis;
}

// ─── Boş subject result ───────────────────────────────────────

export function emptyResult() {
  return { dogru: '', yanlis: '' };
}

export type SubjectResult = { dogru: string; yanlis: string };
export type ResultMap = Record<string, SubjectResult>;
