// Deneme analizinde "çalışılacak konular": tamamen başarı yüzdesine göre, ders ders iki sütun.
// Hem sunucuda (analiz üretilirken) hem tarayıcıda (eski kayıtlı analizler gösterilirken) kullanılır.

/** Bir kazanımın değerlendirmeye girmesi için gereken en az soru sayısı */
export const MIN_SORU = 2;
/** Bu yüzdenin altı: öncelikli (sol sütun) */
export const PRIORITY_BELOW = 50;
/** Bu yüzde ve altı: ikinci öncelik (sağ sütun). Üstü listeye girmez. */
export const SECOND_MAX = 75;

export type TopicRow = {
  ders: string; kazanim: string; soru: number; dogru: number; yanlis: number; bos: number;
  net?: number; basari?: number; kayip?: number; denemeler?: string[];
  /** Öğrencinin kendi analizinde bu kazanımın yanlış/boşlarına verdiği hata türleri (tür → adet) */
  hata?: Record<string, number>;
};

export type DersKonulari = {
  ders: string;
  basari: number | null; // dersin kazanım verisinden başarısı
  oncelikli: TopicRow[];
  ikinci: TopicRow[];
  /** Listeye alınmayanlar (neden ile): yapay zekâ görüşme/günlük/öğrenci notuna dayanarak çıkardı ya da hepsi dikkat hatası */
  cikarilan: { kazanim: string; basari: number; neden: string }[];
};

export const topicKey = (ders: string, kazanim: string) =>
  `${ders}|${kazanim.toLocaleLowerCase('tr').replace(/[.…]+$/g, '').replace(/\s+/g, ' ').trim()}`;

const NON_TOPIC = new Set(['dikkat', 'okuma', 'islem', 'sure']);

/** Yanlış/boşlarının hepsi öğrencinin "dikkat/okuma/işlem/süre" dediği hatalarsa konu eksiği sayılmaz */
export function onlyNonTopicErrors(r: TopicRow): boolean {
  const miss = r.yanlis + r.bos;
  if (!r.hata || miss === 0) return false;
  const nonTopic = Object.entries(r.hata).filter(([t]) => NON_TOPIC.has(t)).reduce((s, [, n]) => s + n, 0);
  return nonTopic >= miss;
}

const basariOf = (r: TopicRow) => r.basari ?? Math.round(((r.net ?? r.dogru) / Math.max(1, r.soru)) * 100);

/** Değerlendirmeye giren ve %75 ve altında kalan kazanımlar (yapay zekânın çıkarabileceği adaylar) */
export function candidateTopics<T extends TopicRow>(rows: T[]): T[] {
  return rows.filter((r) => r.soru >= MIN_SORU && basariOf(r) <= SECOND_MAX && !onlyNonTopicErrors(r));
}

/**
 * Ders ders iki sütuna ayırır. excluded: topicKey → neden (yapay zekânın kanıtla çıkardıkları).
 * Dersler en zayıftan güçlüye sıralanır; sütun içinde en düşük başarı önce.
 */
export function classifyTopics(rows: TopicRow[], excluded: Map<string, string> = new Map()): DersKonulari[] {
  const byDers = new Map<string, DersKonulari>();
  const dersAgg = new Map<string, { soru: number; net: number }>();
  for (const r of rows) {
    const a = dersAgg.get(r.ders) ?? { soru: 0, net: 0 };
    a.soru += r.soru; a.net += r.net ?? r.dogru;
    dersAgg.set(r.ders, a);
  }
  const get = (ders: string) => {
    let d = byDers.get(ders);
    if (!d) {
      const a = dersAgg.get(ders);
      d = { ders, basari: a && a.soru ? Math.round((a.net / a.soru) * 100) : null, oncelikli: [], ikinci: [], cikarilan: [] };
      byDers.set(ders, d);
    }
    return d;
  };

  for (const r of rows) {
    const b = basariOf(r);
    if (r.soru < MIN_SORU || b > SECOND_MAX) continue;
    const d = get(r.ders);
    const why = excluded.get(topicKey(r.ders, r.kazanim));
    if (why) { d.cikarilan.push({ kazanim: r.kazanim, basari: b, neden: why }); continue; }
    if (onlyNonTopicErrors(r)) {
      d.cikarilan.push({ kazanim: r.kazanim, basari: b, neden: 'Yanlışların hepsini dikkat/okuma/işlem/süre hatası olarak işaretledin' });
      continue;
    }
    (b < PRIORITY_BELOW ? d.oncelikli : d.ikinci).push({ ...r, basari: b });
  }
  const sort = (a: TopicRow, b: TopicRow) => basariOf(a) - basariOf(b) || b.soru - a.soru;
  return Array.from(byDers.values())
    .map((d) => ({ ...d, oncelikli: d.oncelikli.sort(sort), ikinci: d.ikinci.sort(sort) }))
    .filter((d) => d.oncelikli.length || d.ikinci.length || d.cikarilan.length)
    .sort((a, b) => (a.basari ?? 100) - (b.basari ?? 100));
}
