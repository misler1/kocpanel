import { calcNetYKS, calcNetLGS, TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS } from "@/app/denemeler/examConstants";
import { callLlm, parseJsonLoose } from "@/lib/ai/llm";
import { candidateTopics, classifyTopics, topicKey, type DersKonulari } from "@/lib/exam-topic-priority";
import { ERROR_LABEL, NON_TOPIC_ERRORS } from "@/lib/exam-error-types";

// Deneme analizi: ders netleri + karnelerdeki soru/kazanım verisi (question_results) birleştirilir.
// Kazanım tablosu kodda (kesin) hesaplanır; yapay zekâ bu tabloyu yorumlar, sayı uydurmaz.

export const MAX_ANALYSIS_EXAMS = 10;

// --- exams tablosunun gerçek şemasına göre tipler ---
export interface SubjectResultRaw {
  dogru: string; // "" olabilir (girilmemiş demek)
  yanlis: string;
}

/** Karnedeki soru satırı (pdfTemplates/types.ts → ExamQuestion) */
export interface QuestionRow {
  s: string; n: number; k: string; dc: string; oc: string | null; r: "D" | "Y" | "B";
}

export interface ExamRow {
  id: string;
  exam_name: string;
  exam_type: string; // "TYT" | "AYT" | "LGS" | ...
  exam_date: string;
  net_score: string;
  subject_results: Record<string, SubjectResultRaw>;
  question_results?: QuestionRow[] | null;
  subject_averages?: Record<string, number> | null;
  tyt_puan: string | null;
  say_puan: string | null;
  ea_puan: string | null;
  soz_puan: string | null;
  lgs_puan: string | null;
  linked_exam_id: string | null;
  /** Öğrencinin kendi analizi: yanlış/boş sorulara hata türü + not */
  student_analysis?: { items?: { key: string; type: string; note: string }[] } | null;
}

export interface MeetingInput { date: string; notes: string }

export interface TopicProgressInput {
  subject: string;
  topic: string;
  status: string;
  updatedAt: string;
}

export interface StudentExamGroup {
  studentId: string;
  studentName: string;
  exams: ExamRow[];
  meetings: MeetingInput[];
  topics: TopicProgressInput[];
  /** Denemelerden sonra yapılan çalışmalar (günlükler): ders/konu bazında toplanmış */
  studies?: StudyInput[];
}

export interface StudyInput { subject: string; topic: string; questions: number; minutes: number; lastDate: string }

/** Kodda hesaplanan kazanım satırı (öğrenciye de gösterilir) */
export interface KazanimRow {
  ders: string;
  kazanim: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;     // doğru − yanlış/4 (LGS: /3)
  basari: number;  // net / soru × 100
  kayip: number;   // soru − net: bu kazanımda kaybedilen net (öncelik sırası buna göre)
  denemeler: string[]; // yanlış/boş olduğu denemeler
  hata?: Record<string, number>; // öğrencinin işaretlediği hata türleri (tür → adet)
  notlar?: string[];              // öğrencinin bu kazanımdaki soru notları
}

/** Ders özeti (kazanım verisinden) */
export interface DersOzet { ders: string; soru: number; dogru: number; yanlis: number; bos: number; net: number; basari: number }

export interface StudentAnalysis {
  student_id?: string;
  student_name: string;
  genel_yorum: string;
  trend: string;
  guclu_dersler: string[];
  zayif_dersler: string[];
  ders_yorumlari: { ders: string; yorum: string }[];
  kazanim_oncelikleri: { ders: string; kazanim: string; durum: string; oneri: string }[];
  guclu_kazanimlar: { ders: string; kazanim: string }[];
  calisma_plani: string[];
  ogrenciye_mesaj: string;
  capraz_degerlendirme: string | null; // görüşme notlarına dayanır: öğrenciye gösterilmez
  oneriler: string[]; // eski kayıtlarla uyum (çalışma planıyla aynı)
  /** Kodda hesaplanan tablo: en çok kaçırılan ve sağlam kazanımlar */
  kazanim_tablosu?: {
    zayif: KazanimRow[]; guclu: KazanimRow[]; soru_verisi_olan_deneme: number;
    tum?: KazanimRow[];      // bütün kazanımlar (konu başarı analizi)
    dersler?: DersOzet[];    // ders başarı özeti
    oncelik?: KazanimRow[][]; // 1., 2., 3. öncelikli konu listeleri (kaybedilen nete göre)
  };
  analiz_id?: string; // kaydedildiyse
  /** Ders ders iki sütun: öncelikli (%0–49) / ikinci öncelik (%50–75); kodda hesaplanır */
  ders_konulari?: DersKonulari[];
  /** Öğrencinin işaretlediği hata türleri (tüm denemeler) */
  hata_ozeti?: { tur: string; etiket: string; adet: number }[];
  /** Dikkat/okuma/işlem/süre hatalarına yönelik öneriler */
  hata_tavsiyeleri?: string[];
}

export interface ExamAnalysisResult {
  ogrenciler: StudentAnalysis[];
  karsilastirma: string | null;
  kaynak?: string; // hangi yapay zekâ
}

const SUBJECT_LABEL: Record<string, string> = Object.fromEntries(
  [...TYT_SUBJECTS, ...AYT_SUBJECTS, ...LGS_SUBJECTS].map((s) => [s.key, s.label])
);
const subjectLabel = (key: string) => SUBJECT_LABEL[key] ?? key.charAt(0).toLocaleUpperCase("tr") + key.slice(1);

function subjectNets(results: Record<string, SubjectResultRaw>, examType: string) {
  const out: Record<string, { dogru: number; yanlis: number; net: number }> = {};
  for (const [subject, v] of Object.entries(results ?? {})) {
    const d = v?.dogru?.trim() ? parseFloat(v.dogru) : NaN;
    const y = v?.yanlis?.trim() ? parseFloat(v.yanlis) : NaN;
    if (isNaN(d) && isNaN(y)) continue;
    const dd = isNaN(d) ? 0 : d;
    const yy = isNaN(y) ? 0 : y;
    out[subject] = { dogru: dd, yanlis: yy, net: examType === "LGS" ? calcNetLGS(dd, yy) : calcNetYKS(dd, yy) };
  }
  return out;
}

const normK = (s: string) => s.toLocaleLowerCase("tr").replace(/[.…]+$/g, "").replace(/\s+/g, " ").trim();

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Seçilen denemelerdeki soruları kazanım bazında toplar (aynı kazanım farklı denemelerde birleşir) */
export function aggregateKazanim(exams: ExamRow[]) {
  const map = new Map<string, KazanimRow>();
  let withData = 0;
  for (const e of exams) {
    const qs = Array.isArray(e.question_results) ? e.question_results : [];
    if (qs.length) withData++;
    const penalty = e.exam_type === "LGS" ? 1 / 3 : 1 / 4;
    const notes = new Map((e.student_analysis?.items ?? []).map((i) => [i.key, i]));
    for (const q of qs) {
      if (!q?.k || !q.s) continue;
      const ders = `${e.exam_type === "AYT" || e.exam_type === "TYT" ? `${e.exam_type} ` : ""}${subjectLabel(q.s)}`;
      const key = `${ders}|${normK(q.k)}`;
      const row = map.get(key) ?? { ders, kazanim: q.k.trim(), soru: 0, dogru: 0, yanlis: 0, bos: 0, net: 0, basari: 0, kayip: 0, denemeler: [] };
      row.soru++;
      if (q.r === "D") { row.dogru++; row.net += 1; }
      else {
        if (q.r === "Y") { row.yanlis++; row.net -= penalty; } else row.bos++;
        if (!row.denemeler.includes(e.exam_name)) row.denemeler.push(e.exam_name);
        const n = notes.get(`${q.s}|${q.n}`);
        if (n?.type) { row.hata = row.hata ?? {}; row.hata[n.type] = (row.hata[n.type] ?? 0) + 1; }
        if (n?.note?.trim()) { row.notlar = row.notlar ?? []; row.notlar.push(n.note.trim().slice(0, 160)); }
      }
      map.set(key, row);
    }
  }
  const rows = Array.from(map.values()).map((r) => ({
    ...r, net: r2(r.net), basari: Math.round((r.net / r.soru) * 100), kayip: r2(r.soru - r.net),
  }));

  // En çok net kaybettiren kazanımlar önce (çok soru çıkan konudaki birkaç yanlış da üst sıraya çıkar)
  const zayif = rows.filter((r) => r.yanlis + r.bos > 0).sort((a, b) => b.kayip - a.kayip || a.basari - b.basari);
  const guclu = rows.filter((r) => r.soru >= 2 && r.dogru === r.soru).sort((a, b) => b.soru - a.soru);

  // Öncelikli konu listeleri: en çok net kaybettiren en fazla 33 kazanım üç kademeye bölünür
  const top = zayif.filter((r) => r.kayip >= 0.5).slice(0, 33);
  const size = Math.ceil(top.length / 3) || 0;
  const oncelik = size ? [top.slice(0, size), top.slice(size, size * 2), top.slice(size * 2)].filter((t) => t.length) : [];

  // Ders özeti
  const dmap = new Map<string, DersOzet>();
  for (const r of rows) {
    const d = dmap.get(r.ders) ?? { ders: r.ders, soru: 0, dogru: 0, yanlis: 0, bos: 0, net: 0, basari: 0 };
    d.soru += r.soru; d.dogru += r.dogru; d.yanlis += r.yanlis; d.bos += r.bos; d.net += r.net;
    dmap.set(r.ders, d);
  }
  const dersler = Array.from(dmap.values()).map((d) => ({ ...d, net: r2(d.net), basari: Math.round((d.net / d.soru) * 100) }))
    .sort((a, b) => a.basari - b.basari);

  const tum = [...rows].sort((a, b) => a.ders.localeCompare(b.ders, "tr") || a.basari - b.basari);
  return { zayif, guclu, withData, tum, dersler, oncelik };
}

function formatExam(exam: ExamRow): string {
  const nets = subjectNets(exam.subject_results, exam.exam_type);
  const avg = exam.subject_averages ?? {};
  const lines = Object.entries(nets).map(([s, v]) => {
    const o = typeof avg[s] === "number" ? ` (kurum ort. ${avg[s]})` : "";
    return `    - ${subjectLabel(s)}: ${v.dogru}D ${v.yanlis}Y → ${v.net} net${o}`;
  }).join("\n");
  const puan = [
    exam.tyt_puan && `TYT ${exam.tyt_puan}`, exam.say_puan && `SAY ${exam.say_puan}`, exam.ea_puan && `EA ${exam.ea_puan}`,
    exam.soz_puan && `SÖZ ${exam.soz_puan}`, exam.lgs_puan && `LGS ${exam.lgs_puan}`,
  ].filter(Boolean).join(", ");
  return `  • ${exam.exam_name} (${exam.exam_type}, ${exam.exam_date}) — toplam ${exam.net_score} net${puan ? `, puan: ${puan}` : ""}\n${lines}`;
}

/** Öğrencinin tüm denemelerde işaretlediği hata türleri (kazanım verisi olmayan ders satırları dahil) */
function errorSummary(exams: ExamRow[]) {
  const counts = new Map<string, number>();
  const notes: string[] = [];
  for (const e of exams) {
    for (const it of e.student_analysis?.items ?? []) {
      if (it.type) counts.set(it.type, (counts.get(it.type) ?? 0) + 1);
      if (it.note?.trim() && notes.length < 30) notes.push(`${ERROR_LABEL[it.type] ?? "?"}: ${it.note.trim().slice(0, 140)}`);
    }
  }
  const list = Array.from(counts.entries()).map(([tur, adet]) => ({ tur, etiket: ERROR_LABEL[tur] ?? tur, adet }))
    .sort((a, b) => b.adet - a.adet);
  return { list, notes };
}

const hataText = (h?: Record<string, number>) =>
  h ? ` · öğrencinin işaretlediği: ${Object.entries(h).map(([t, n]) => `${n} ${ERROR_LABEL[t] ?? t}`).join(", ")}` : "";

function formatGroup(g: StudentExamGroup, compact: boolean) {
  const { tum, withData } = aggregateKazanim(g.exams);
  const candidates = candidateTopics(tum);
  const err = errorSummary(g.exams);
  const firstExam = g.exams[0]?.exam_date ?? "";

  const examsTxt = g.exams.map(formatExam).join("\n");
  const cand = withData === 0
    ? "\n\n  KAZANIM VERİSİ YOK (yalnızca ders netleri). cikarilacak boş dizi olsun."
    : `\n\n  ADAY KONULAR (kodda belirlendi: en az 2 soru, başarı %75 ve altı; numarayla an):\n` +
      candidates.slice(0, compact ? 40 : 90).map((r, i) =>
        `    #${i + 1} [${r.ders}] ${r.kazanim}: ${r.soru} soru, ${r.dogru}D ${r.yanlis}Y ${r.bos}B, başarı %${r.basari}${hataText(r.hata)}` +
        (r.notlar?.length && !compact ? ` · notları: "${r.notlar.slice(0, 3).join('" / "')}"` : "")).join("\n");
  const meetings = g.meetings.length
    ? `\n\n  GÖRÜŞME NOTLARI (koçun yazdığı, yeniden eskiye):\n${g.meetings.slice(0, compact ? 3 : 5).map((m) => `    - ${m.date.slice(0, 10)}: ${m.notes.slice(0, compact ? 300 : 700)}`).join("\n")}`
    : "\n\n  GÖRÜŞME NOTU YOK.";
  const studies = g.studies?.length
    ? `\n\n  İLK DENEMEDEN (${firstExam}) SONRAKİ ÇALIŞMALAR (günlüklerden, ders/konu toplamı):\n${g.studies.slice(0, compact ? 20 : 45).map((t) => `    - ${t.subject}${t.topic ? ` / ${t.topic}` : ""}: ${t.questions} soru${t.minutes ? `, ${t.minutes} dk` : ""} (son ${t.lastDate})`).join("\n")}`
    : "\n\n  GÜNLÜK ÇALIŞMA KAYDI YOK.";
  const errTxt = err.list.length
    ? `\n\n  ÖĞRENCİNİN KENDİ ANALİZİ (yanlış/boş sorulara verdiği hata türleri): ${err.list.map((e) => `${e.etiket} ${e.adet}`).join(", ")}` +
      (err.notes.length && !compact ? `\n  Notları:\n${err.notes.slice(0, 20).map((n) => `    - ${n}`).join("\n")}` : "")
    : "";
  return `ÖĞRENCİ: ${g.studentName}\n  DENEMELER (eskiden yeniye):\n${examsTxt}${cand}${meetings}${studies}${errTxt}`;
}

function systemPrompt(multi: boolean) {
  return `Sen YKS ve LGS'ye hazırlanan öğrencilerle çalışan deneyimli bir eğitim koçusun. Deneme analizini Türkçe, KISA ve SADE hazırlıyorsun.

ÖNEMLİ: Konuların önceliğini SEN belirlemiyorsun; kod başarı yüzdesine göre ders ders ayırıyor. Senin görevlerin:
1) cikarilacak: ADAY KONULAR içinden, artık çalışılması GEREKMEYENLERİ seç. Yalnızca açık bir kanıt varsa çıkar:
   - Görüşme notunda bu konunun çalışıldığı / kitabının bitirildiği / halledildiği yazıyorsa,
   - Görüşme notunda bu konudaki yanlışların dikkat hatası olduğu konuşulduysa,
   - Günlüklerde denemeden sonra bu konuya (aynı ders ve benzer konu adı) yeterli çalışma varsa (ör. 40+ soru ya da 60+ dakika),
   - Öğrencinin notu konunun bilindiğini açıkça gösteriyorsa.
   Kanıt yoksa çıkarma. Her çıkarma için kısa neden yaz (ör. "12 Kasım görüşmesinde kitabı bitirdiği konuşuldu").
2) hata_tavsiyeleri: Öğrencinin dikkat / okuma / işlem / süre hatası işaretlediği sorular varsa, sayısını anarak somut alışkanlık önerileri ver
   (dikkat: uyku düzeni, düzenli beslenme, ekran süresini azaltma, kısa doğa yürüyüşleri, süre tutarak soru çözmeye devam;
    okuma: soru kökünün altını çizerek okuma, olumsuz ifadeleri işaretleme, paragrafta önce soruyu okuma;
    işlem: işlemi kâğıda düzenli yazma, sağlama yapma; süre: turlama tekniği, süreli deneme pratiği). Yoksa boş dizi.
3) genel_yorum: 2-3 cümle. trend: 1-2 cümle (tek denemede "Tek deneme, trend belirlenemedi").
4) calisma_plani: 3-5 kısa, uygulanabilir madde.
5) ogrenciye_mesaj: öğrenciye "sen" diye, 2-3 cümle, dürüst ama cesaretlendirici. Görüşme notlarındaki özel bilgileri buraya taşıma.
6) capraz_degerlendirme: görüşme notu varsa 2-3 cümle (öğrenciye gösterilmez), yoksa null.
Sayı uydurma, verilen sayılara dayan. TYT, AYT ve LGS'yi birbiriyle kıyaslama.
${multi ? "Birden fazla öğrenci var: her öğrenciyi ayrı değerlendir; karsilastirma alanına kısa kıyas yaz." : "Tek öğrenci var: karsilastirma null."}

Yalnızca geçerli JSON döndür:
{"ogrenciler":[{"student_name":"string","genel_yorum":"string","trend":"string",
"cikarilacak":[{"no":3,"neden":"string"}],
"hata_tavsiyeleri":["string"],"calisma_plani":["string"],"ogrenciye_mesaj":"string","capraz_degerlendirme":"string veya null"}],
"karsilastirma":"string veya null"}`;
}

export async function analyzeExams(groups: StudentExamGroup[]): Promise<ExamAnalysisResult> {
  if (groups.length === 0) throw new Error("En az bir öğrenci/deneme seçilmeli.");
  const totalExams = groups.reduce((sum, g) => sum + g.exams.length, 0);
  if (totalExams === 0) throw new Error("En az bir deneme seçilmeli.");
  if (totalExams > MAX_ANALYSIS_EXAMS) throw new Error(`Toplamda en fazla ${MAX_ANALYSIS_EXAMS} deneme analiz edilebilir.`);

  const multi = groups.length > 1;
  const res = await callLlm({
    system: systemPrompt(multi),
    user: groups.map((g) => formatGroup(g, false)).join("\n\n---\n\n"),
    userCompact: groups.map((g) => formatGroup(g, true)).join("\n\n---\n\n"),
    maxTokens: multi ? 5000 : 3500,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = parseJsonLoose<{ ogrenciler?: any[]; karsilastirma?: string | null }>(res.text);
  const list = Array.isArray(parsed?.ogrenciler) ? parsed.ogrenciler : [];
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const ogrenciler: StudentAnalysis[] = groups.map((g, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = (list.find((x) => x?.student_name === g.studentName) ?? list[i] ?? {}) as any;
    const { zayif, guclu, withData, tum, dersler, oncelik } = aggregateKazanim(g.exams);
    const candidates = candidateTopics(tum);
    // Yapay zekânın kanıtla çıkardığı konular (yalnızca aday listesindeki numaralar geçerli)
    const excluded = new Map<string, string>();
    for (const c of arr<{ no?: number; neden?: string }>(o.cikarilacak)) {
      const r = candidates[Number(c?.no) - 1];
      if (r && c?.neden) excluded.set(topicKey(r.ders, r.kazanim), String(c.neden).slice(0, 200));
    }
    const err = errorSummary(g.exams);
    const hasNonTopic = err.list.some((e) => NON_TOPIC_ERRORS.has(e.tur));
    const plan = arr<string>(o.calisma_plani);
    return {
      student_id: g.studentId,
      student_name: g.studentName,
      genel_yorum: String(o.genel_yorum ?? ""),
      trend: String(o.trend ?? ""),
      guclu_dersler: [], zayif_dersler: [], ders_yorumlari: [], kazanim_oncelikleri: [], guclu_kazanimlar: [],
      calisma_plani: plan,
      oneriler: plan,
      ogrenciye_mesaj: String(o.ogrenciye_mesaj ?? ""),
      capraz_degerlendirme: g.meetings.length && o.capraz_degerlendirme ? String(o.capraz_degerlendirme) : null,
      ders_konulari: withData ? classifyTopics(tum, excluded) : [],
      hata_ozeti: err.list,
      hata_tavsiyeleri: hasNonTopic ? arr<string>(o.hata_tavsiyeleri).slice(0, 6) : [],
      kazanim_tablosu: {
        zayif: zayif.slice(0, 20), guclu: guclu.slice(0, 10), soru_verisi_olan_deneme: withData,
        tum: tum.slice(0, 400), dersler, oncelik,
      },
    };
  });

  return {
    ogrenciler,
    karsilastirma: multi && parsed?.karsilastirma ? String(parsed.karsilastirma) : null,
    kaynak: res.provider === "gemini" ? `Google Gemini (${res.model})` : `Groq (${res.model})`,
  };
}
