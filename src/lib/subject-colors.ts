// Haftalık programda ders renkleri. Haftalık Takip panosu ve program onay ekranı aynı renkleri kullanır.

// Ders renkleri (TYT/AYT/YDT öneki kaldırılıp aynı derse aynı renk verilir)
export const SUBJECT_COLORS: Record<string, string> = {
  'Türkçe': '#ef4444', 'Paragraf': '#f97316', 'Matematik': '#3b82f6', 'Geometri': '#06b6d4',
  'Fizik': '#8b5cf6', 'Kimya': '#ec4899', 'Biyoloji': '#22c55e', 'Tarih': '#d97706',
  'Coğrafya': '#14b8a6', 'Felsefe': '#a855f7', 'Din Kültürü': '#84cc16', 'Edebiyat': '#e11d48',
  'İngilizce': '#6366f1', 'Fen Bilgisi': '#16a34a', 'İnkılap Tarihi': '#b45309',
  'Görüşme': '#0d9488', // Ajanda'dan gelen koç görüşmesi
};
const FALLBACK_COLORS = ['#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

export function getSubjectColor(subject: string): string {
  const base = (subject || '').replace(/^(TYT|AYT|YDT)\s+/, '').trim();
  if (SUBJECT_COLORS[base]) return SUBJECT_COLORS[base];
  let h = 0;
  for (const ch of base) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}
