// Konu ilerleyişi: bir konu "tamamlandı" sayılması için üç adım gerekir:
// 1) konu çalışıldı, 2) kaynaklardan herhangi birinden (1., 2. veya 3.) soru çözüldü, 3) yanlışlar kontrol edildi.

export type TopicFlags = {
  konu_tamamlandi?: boolean | null;
  kaynak1_sorular?: boolean | null;
  kaynak2_sorular?: boolean | null;
  kaynak3_sorular?: boolean | null;
  yanlislar_kontrol?: boolean | null;
};

/** 1., 2. veya 3. kaynaktan soru çözüldü mü */
export const anySourceSolved = (t: TopicFlags) => !!(t.kaynak1_sorular || t.kaynak2_sorular || t.kaynak3_sorular);

/** Tamamlanan zorunlu adım sayısı (0–3) */
export const topicStepsDone = (t: TopicFlags) =>
  [!!t.konu_tamamlandi, anySourceSolved(t), !!t.yanlislar_kontrol].filter(Boolean).length;

export const isTopicDone = (t: TopicFlags) => topicStepsDone(t) === 3;

export const TOPIC_FLAG_COLUMNS = 'konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol';
