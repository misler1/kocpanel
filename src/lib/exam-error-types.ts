// Öğrencinin deneme analizinde yanlış/boş soruya verdiği hata türleri (exams.student_analysis.items[].type)

export const ERROR_TYPES = [
  { key: 'konu', label: 'Konu eksiği', emoji: '📚', hint: 'Konuyu bilmiyorum / eksik' },
  { key: 'soru', label: 'Soru eksiği', emoji: '🧩', hint: 'Konuyu biliyorum ama bu tip soruyu çözemedim' },
  { key: 'dikkat', label: 'Dikkat hatası', emoji: '👀', hint: 'Biliyordum, dikkatsizlikten kaçırdım' },
  { key: 'okuma', label: 'Okuma hatası', emoji: '📖', hint: 'Soruyu yanlış / eksik okudum' },
  { key: 'islem', label: 'İşlem hatası', emoji: '✏️', hint: 'Hesapta hata yaptım' },
  { key: 'sure', label: 'Süre yetmedi', emoji: '⏱️', hint: 'Zamanım kalmadı' },
  { key: 'diger', label: 'Diğer', emoji: '💭', hint: '' },
] as const;

export type ErrorTypeKey = (typeof ERROR_TYPES)[number]['key'];

export const ERROR_LABEL: Record<string, string> = Object.fromEntries(ERROR_TYPES.map((t) => [t.key, t.label]));
export const ERROR_EMOJI: Record<string, string> = Object.fromEntries(ERROR_TYPES.map((t) => [t.key, t.emoji]));

/** Bu türler konu eksikliği sayılmaz: kazanım "çalışılacak konular"a alınmaz, yerine alışkanlık önerisi verilir */
export const NON_TOPIC_ERRORS = new Set(['dikkat', 'okuma', 'islem', 'sure']);

export type SelfAnalysisItem = { key: string; type: string; note: string };
export type SelfAnalysis = { items: SelfAnalysisItem[]; done_at?: string | null; updated_at?: string | null };
