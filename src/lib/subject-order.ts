// src/lib/subject-order.ts
// Konu ilerleyişi sayfasında ders kartlarının görünme sırası.
// Sırada olmayan (elle eklenmiş özel) dersler listenin sonuna,
// kendi aralarında alfabetik olarak eklenir.

export const SUBJECT_ORDER: string[] = [
  // TYT
  'TYT Türkçe',
  'TYT Paragraf',
  'TYT Tarih',
  'TYT Coğrafya',
  'TYT Felsefe',
  'TYT Din Kültürü',
  'TYT Matematik',
  'TYT Geometri',
  'TYT Fizik',
  'TYT Kimya',
  'TYT Biyoloji',

  // AYT — Sözel/EA sosyal grubu + Sayısal
  'AYT Edebiyat',
  'AYT Tarih',
  'AYT Coğrafya',
  'AYT Sosyal-2 Tarih',
  'AYT Sosyal-2 Coğrafya',
  'AYT Felsefe',
  'AYT Din Kültürü',
  'AYT Matematik',
  'AYT Geometri',
  'AYT Fizik',
  'AYT Kimya',
  'AYT Biyoloji',

  // Dil
  'İngilizce',

  // LGS
  'Türkçe',
  'Paragraf',
  'Matematik',
  'Fen Bilgisi',
  'İnkılap Tarihi',
  'Din Kültürü',
];

const normTR = (s: string) => s.toLocaleLowerCase('tr').trim();

export function subjectSortIndex(label: string): number {
  const i = SUBJECT_ORDER.findIndex((s) => normTR(s) === normTR(label));
  return i === -1 ? SUBJECT_ORDER.length + 1 : i;
}