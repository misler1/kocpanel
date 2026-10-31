// Öğrenci paneli için ortak görsel yardımcılar (ders emojileri, gün renkleri, motivasyon cümleleri).

const SUBJECT_EMOJI: [RegExp, string][] = [
  [/geometri/i, '📐'],
  [/matemat|mat\b/i, '🔢'],
  [/paragraf/i, '📝'],
  [/türkçe|turkce|dil ve anlatım/i, '📖'],
  [/edebiyat/i, '✒️'],
  [/fizik/i, '⚡'],
  [/kimya/i, '🧪'],
  [/biyoloji/i, '🧬'],
  [/fen/i, '🔬'],
  [/inkılap|inkilap|tarih/i, '🏛️'],
  [/coğrafya|cografya/i, '🌍'],
  [/sosyal/i, '🗺️'],
  [/felsefe|mantık|psikoloji|sosyoloji/i, '💭'],
  [/din/i, '🕊️'],
  [/ingilizce|yabancı|almanca|ydt|dil/i, '💬'],
  [/deneme/i, '🎯'],
];

export function subjectEmoji(subject?: string | null) {
  if (!subject) return '📚';
  return SUBJECT_EMOJI.find(([re]) => re.test(subject))?.[1] ?? '📚';
}

// Pazartesi=0 … Pazar=6
export const DAY_STYLES = [
  { emoji: '🌱', bar: 'bg-[#8B5CF6]', soft: 'bg-[#F1EBFF]', text: 'text-[#6D3FE0]' },
  { emoji: '🚀', bar: 'bg-[#2F9BEA]', soft: 'bg-[#E3F2FE]', text: 'text-[#1F78BD]' },
  { emoji: '🌈', bar: 'bg-[#16A36F]', soft: 'bg-[#E2F8EE]', text: 'text-[#11815A]' },
  { emoji: '⭐', bar: 'bg-[#F59E0B]', soft: 'bg-[#FFF3D6]', text: 'text-[#B76E00]' },
  { emoji: '🎈', bar: 'bg-[#EC4899]', soft: 'bg-[#FDE7F3]', text: 'text-[#C0307A]' },
  { emoji: '🌞', bar: 'bg-[#F97316]', soft: 'bg-[#FFEDDF]', text: 'text-[#C2570C]' },
  { emoji: '🌙', bar: 'bg-[#6366F1]', soft: 'bg-[#E9EAFE]', text: 'text-[#4648C9]' },
];

const QUOTES = [
  'Küçük adımlar büyük başarılar getirir. 🐢✨',
  'Bugün çözdüğün her soru, yarınki seni güçlendirir. 💪',
  'Hata yapmak öğrenmenin bir parçası. Devam! 🌱',
  'Odaklan, çalış, mola ver, tekrarla. 🔁',
  'Sen düşündüğünden çok daha güçlüsün! 🦸',
  'Bir sayfa daha, bir soru daha. Yapabilirsin! 📚',
  'Başarı, her gün tekrarlanan küçük çabaların toplamıdır. 🧩',
];

export function dailyQuote() {
  const d = new Date();
  return QUOTES[(d.getFullYear() + d.getMonth() * 31 + d.getDate()) % QUOTES.length];
}

// İlerleme yüzdesine göre cesaretlendirici mesaj
export function cheer(pct: number, total: number) {
  if (total === 0) return 'Henüz görev yok, keyfine bak! 😎';
  if (pct >= 100) return 'Harikasın, hepsini bitirdin! 🎉';
  if (pct >= 70) return 'Az kaldı, bitiş çizgisi göründü! 🏁';
  if (pct >= 40) return 'Güzel gidiyorsun, devam! 🚀';
  if (pct > 0) return 'İyi başlangıç! Bir sonrakine geçelim. 💪';
  return 'Hadi ilk görevle başlayalım! 🌟';
}
