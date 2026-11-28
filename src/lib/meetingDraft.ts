// Görüşme formları için taslak (kaydedilmemiş görüşme) saklama yardımcıları.
// İki form da (Görüşme ekle sayfası ve öğrencinin görüşmeler sayfasındaki form) aynı anahtarı kullanır:
// aynı öğrenci için birinde başlanan taslak diğerinde de görünür.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';

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
  /** Yüklenmiş defter fotoğrafları (depodaki yollar) */
  photos?: string[];
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
  queueRemote(key, d);
}
export function removeDraft(key: string) {
  try { localStorage.removeItem(key); localStorage.removeItem(syncMark(key)); } catch { /* depolama kapalı */ }
  const t = pending.get(key);
  if (t) { clearTimeout(t.timer); pending.delete(key); }
  // Sunucuda olmadığı bilinen taslak için istek atılmaz (boş formda süre sayacı her dakika buraya gelir)
  if (remoteKnown.has(key) || t) {
    remoteKnown.delete(key);
    void (createClient() as any).from('meeting_drafts').delete().eq('draft_key', key).then(() => {}, () => {});
  }
}

// ─── Sunucu kopyası (supabase/gorusme_taslaklari.sql): taslak her cihazda ───────────
// Tarayıcıya hemen, sunucuya en geç birkaç saniyede bir yazılır. Form açılırken tarayıcıdaki ve sunucudaki
// taslaktan daha yeni olanı kullanılır. Tablo kurulmamışsa sessizce yalnızca tarayıcı kullanılır.
const REMOTE_DELAY_MS = 2000;
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; d: MeetingDraft }>();
const remoteKnown = new Set<string>();

// Sunucuya gönderilmiş son sürümün işareti: sunucuda artık yoksa (başka cihazda kaydedildi ya da silindi)
// tarayıcıdaki eski kopya geri yüklenmez.
const syncMark = (key: string) => `${key}#s`;

function pushRemote(key: string, d: MeetingDraft) {
  remoteKnown.add(key);
  void (createClient() as any).from('meeting_drafts')
    .upsert({ draft_key: key, student_id: d.studentId || null, data: d, saved_at: new Date(d.savedAt).toISOString() }, { onConflict: 'user_id,draft_key' })
    .then(({ error }: { error: unknown }) => {
      if (!error) try { localStorage.setItem(syncMark(key), String(d.savedAt)); } catch { /* depolama kapalı */ }
    }, () => {});
}
function queueRemote(key: string, d: MeetingDraft) {
  const prev = pending.get(key);
  if (prev) { prev.d = d; return; } // en geç REMOTE_DELAY_MS sonra son hali gider
  const timer = setTimeout(() => {
    const p = pending.get(key);
    pending.delete(key);
    if (p) pushRemote(key, p.d);
  }, REMOTE_DELAY_MS);
  pending.set(key, { timer, d });
}
/** Bekleyen sunucu yazımlarını hemen gönderir (sayfadan çıkarken) */
export function flushRemoteDrafts() {
  for (const [key, p] of pending) { clearTimeout(p.timer); pushRemote(key, p.d); }
  pending.clear();
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushRemoteDrafts);

/** Tarayıcıdaki ve sunucudaki taslaktan daha yeni olanı döndürür (sunucudaki yeniyse tarayıcıya da yazılır). */
export async function loadDraft(key: string): Promise<MeetingDraft | null> {
  const local = readDraft(key);
  try {
    const res = await Promise.race([
      (createClient() as any).from('meeting_drafts').select('data').eq('draft_key', key).maybeSingle(),
      new Promise<null>((r) => setTimeout(() => r(null), 3000)), // yavaş bağlantıda formu bekletme
    ]);
    if (!res || (res as any).error) return local; // zaman aşımı ya da tablo yok
    const remote = (res as any).data?.data as MeetingDraft | undefined;
    if (!remote && local) {
      // Tarayıcıdaki taslak sunucuya gitmişti ama artık yok: başka cihazda kaydedildi ya da silindi
      let mark = 0;
      try { mark = Number(localStorage.getItem(syncMark(key)) ?? 0); } catch { /* depolama kapalı */ }
      if (mark && mark >= local.savedAt) {
        try { localStorage.removeItem(key); localStorage.removeItem(syncMark(key)); } catch { /* depolama kapalı */ }
        return null;
      }
    }
    if (remote && remote.v === 1) {
      remoteKnown.add(key);
      if (!local || remote.savedAt > local.savedAt) {
        try { localStorage.setItem(key, JSON.stringify(remote)); } catch { /* depolama kapalı */ }
        return remote;
      }
    }
  } catch { /* tablo yok ya da bağlantı yok: yalnızca tarayıcı */ }
  return local;
}

/** Bu öğrenci için (bu kullanıcının) sunucuda taslak var mı — öğrenci detayında panelin küçültülmüş açılması için */
export async function hasRemoteDraftFor(studentId: string): Promise<boolean> {
  try {
    const { data } = await (createClient() as any).from('meeting_drafts').select('draft_key').eq('student_id', studentId).limit(1);
    return !!data?.length;
  } catch {
    return false;
  }
}
// Notlar zengin metin (HTML) olabilir: boş paragraf / etiketler içerik sayılmaz
export const hasText = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
// Taslak bu süreden eskiyse süre sayacı kaldığı yerden devam etmez, kaydedilen süre korunur
export const DURATION_RESUME_MS = 3 * 60 * 60 * 1000;
