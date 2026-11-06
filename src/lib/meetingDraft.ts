// Görüşme formları için taslak (kaydedilmemiş görüşme) saklama yardımcıları.
// İki form da (Görüşme ekle sayfası ve öğrencinin görüşmeler sayfasındaki form) aynı anahtarı kullanır:
// aynı öğrenci için birinde başlanan taslak diğerinde de görünür.

// ─── Taslak (kaydedilmemiş görüşme) ───────────────────────────
// Form içeriği yazıldıkça tarayıcıya kaydedilir; sayfa kapanır ya da başka sayfaya geçilirse
// tekrar açıldığında geri yüklenir. Yalnızca görüşme kaydedilince ya da "Taslağı sil" ile silinir.
export interface MeetingDraft {
  v: 1;
  savedAt: number;
  openedAt: number;
  studentId: string;
  meetingType: 'ogrenci' | 'veli';
  createdBy: string;
  createdByOtherName: string;
  scheduledAt: string;
  duration: number;
  durationEditedManually: boolean;
  topic: string;
  notes: string;
  haftalikTakipGetirdi: 'evet' | 'hayir' | '';
}
export const draftKey = (userId: string, lockedStudentId: string) => `gorusme-taslak:${userId}:${lockedStudentId || 'genel'}`;
export function readDraft(key: string): MeetingDraft | null {
  try {
    const raw = localStorage.getItem(key);
    const d = raw ? (JSON.parse(raw) as MeetingDraft) : null;
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}
export function writeDraft(key: string, d: MeetingDraft) {
  try { localStorage.setItem(key, JSON.stringify(d)); } catch { /* depolama kapalı */ }
}
export function removeDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* depolama kapalı */ }
}
// Notlar zengin metin (HTML) olabilir: boş paragraf / etiketler içerik sayılmaz
export const hasText = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
// Taslak bu süreden eskiyse süre sayacı kaldığı yerden devam etmez, kaydedilen süre korunur
export const DURATION_RESUME_MS = 3 * 60 * 60 * 1000;
