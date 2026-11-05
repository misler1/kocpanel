import { youtubeSearchUrl } from './embed';

// Koç ana sayfasındaki "Öneriler" için konu fikirleri: öğrencilerin durumuna ve takvime göre seçilir.
// Hazır video bağlantısı uydurulmaz; her fikir gerçek bir YouTube aramasını açar, koç beğendiği videoyu paylaşır.

export type FeedIdea = { title: string; why: string; url: string };

export function feedIdeas(ctx: { inactive: number; pendingExams: number; total: number; today: string }): FeedIdea[] {
  const ideas: FeedIdea[] = [];
  const add = (title: string, why: string, query: string) => ideas.push({ title, why, url: youtubeSearchUrl(query) });
  const d = new Date(`${ctx.today}T12:00:00Z`);
  const month = d.getUTCMonth() + 1;
  const dow = d.getUTCDay(); // 0 = pazar

  if (ctx.inactive > 0) {
    add('Ertelemeyi yenmek ve motivasyon', `${ctx.inactive} öğrencinin birkaç gündür çalışma kaydı yok`, 'ders çalışmayı erteleme nasıl yenilir YKS motivasyon');
  }
  if (ctx.pendingExams > 0) {
    add('Deneme analizi nasıl yapılır', `${ctx.pendingExams} deneme analiz bekliyor`, 'YKS deneme analizi nasıl yapılır');
  }
  if (dow === 0 || dow === 1) {
    add('Haftalık çalışma planı hazırlamak', 'Haftanın başı: plan yapma zamanı', 'haftalık ders çalışma programı nasıl hazırlanır YKS');
  }
  if (month >= 9 && month <= 10) add('Yeni döneme doğru başlangıç', 'Dönem başı', 'YKS hazırlığına nereden başlamalı');
  else if (month >= 11 && month <= 12) add('Düzenli tekrar ve aralıklı tekrar tekniği', 'Konular birikmeye başladı', 'aralıklı tekrar tekniği ders çalışma');
  else if (month <= 2) add('Yarıyıl tatilini verimli geçirmek', 'Yarıyıl dönemi', 'yarıyıl tatili YKS çalışma planı');
  else if (month <= 4) add('Son aylarda nasıl çalışılır', 'Sınava az kaldı, deneme dönemi', 'YKS son 3 ay nasıl çalışılır');
  else if (month <= 6) add('Sınav kaygısıyla başa çıkmak', 'Sınav dönemi', 'sınav kaygısı ile başa çıkma yöntemleri');
  else add('Yeni hedef belirlemek', 'Yeni hazırlık dönemi', 'YKS hedef belirleme motivasyon');
  add('Odaklanma: Pomodoro tekniği', 'Her zaman işe yarar', 'pomodoro tekniği nasıl uygulanır');

  return ideas.slice(0, 4);
}
