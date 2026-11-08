import { calcNetYKS, calcNetLGS, TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS } from "@/app/denemeler/examConstants";
import { callLlm, parseJsonLoose } from "@/lib/ai/llm";

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
}

/** Kodda hesaplanan kazanım satırı (öğrenciye de gösterilir) */
export interface KazanimRow {
  ders: string;
  kazanim: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  denemeler: string[]; // yanlış/boş olduğu denemeler
}

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
  kazanim_tablosu?: { zayif: KazanimRow[]; guclu: KazanimRow[]; soru_verisi_olan_deneme: number };
  analiz_id?: string; // kaydedildiyse
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

/** Seçilen denemelerdeki soruları kazanım bazında toplar (aynı kazanım farklı denemelerde birleşir) */
export function aggregateKazanim(exams: ExamRow[]) {
  const map = new Map<string, KazanimRow>();
  let withData = 0;
  for (const e of exams) {
    const qs = Array.isArray(e.question_results) ? e.question_results : [];
    if (qs.length) withData++;
    for (const q of qs) {
      if (!q?.k || !q.s) continue;
      const ders = `${e.exam_type === "AYT" || e.exam_type === "TYT" ? `${e.exam_type} ` : ""}${subjectLabel(q.s)}`;
      const key = `${ders}|${normK(q.k)}`;
      const row = map.get(key) ?? { ders, kazanim: q.k.trim(), soru: 0, dogru: 0, yanlis: 0, bos: 0, denemeler: [] };
      row.soru++;
      if (q.r === "D") row.dogru++;
      else {
        if (q.r === "Y") row.yanlis++; else row.bos++;
        if (!row.denemeler.includes(e.exam_name)) row.denemeler.push(e.exam_name);
      }
      map.set(key, row);
    }
  }
  const rows = Array.from(map.values());
  const zayif = rows.filter((r) => r.yanlis + r.bos > 0)
    .sort((a, b) => (b.yanlis + b.bos) - (a.yanlis + a.bos) || (b.yanlis + b.bos) / b.soru - (a.yanlis + a.bos) / a.soru);
  const guclu = rows.filter((r) => r.soru >= 2 && r.dogru === r.soru).sort((a, b) => b.soru - a.soru);
  return { zayif, guclu, withData };
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

const kRow = (r: KazanimRow) =>
  `    - [${r.ders}] ${r.kazanim}: ${r.soru} soru → ${r.dogru}D ${r.yanlis}Y ${r.bos}B${r.denemeler.length ? ` (kaçırdığı: ${r.denemeler.slice(0, 4).join(", ")})` : ""}`;

function formatGroup(g: StudentExamGroup, compact: boolean) {
  const { zayif, guclu, withData } = aggregateKazanim(g.exams);
  const weakLimit = compact ? 25 : 70;
  const strongLimit = compact ? 8 : 25;
  const kazanim = withData === 0
    ? "\n\n  KAZANIM VERİSİ: Bu denemelerde soru/kazanım verisi yok (yalnızca ders netleri var). Kazanım alanlarını boş dizi bırak."
    : `\n\n  KAZANIM TABLOSU (${withData}/${g.exams.length} denemede soru verisi var; aynı kazanım farklı denemelerde toplandı):\n` +
      `  En çok kaçırılanlar (yanlış+boş sayısına göre):\n${zayif.slice(0, weakLimit).map(kRow).join("\n")}` +
      (guclu.length ? `\n  Hep doğru yapılanlar (en az 2 soru):\n${guclu.slice(0, strongLimit).map(kRow).join("\n")}` : "");
  const meetings = g.meetings.length
    ? `\n\n  GÖRÜŞME NOTLARI:\n${g.meetings.slice(0, 3).map((m) => `    - ${m.date.slice(0, 10)}: ${m.notes.slice(0, 220)}`).join("\n")}`
    : "";
  const status: Record<string, string> = { baslanmadi: "başlanmadı", devam: "devam ediyor", tamamlandi: "tamamlandı" };
  const topics = g.topics.length && !compact
    ? `\n\n  KONU İLERLEYİŞİ KAYITLARI (eksik olabilir):\n${g.topics.slice(0, 18).map((t) => `    - ${t.subject} / ${t.topic}: ${status[t.status] ?? t.status}`).join("\n")}`
    : "";
  return `ÖĞRENCİ: ${g.studentName}\n  DENEMELER (eskiden yeniye):\n${g.exams.map(formatExam).join("\n")}${kazanim}${meetings}${topics}`;
}

function systemPrompt(multi: boolean) {
  return `Sen YKS ve LGS'ye hazırlanan öğrencilerle çalışan deneyimli bir eğitim koçusun. Koç öğretmene, öğrencisinin deneme sonuçlarının derinlemesine analizini Türkçe hazırlıyorsun.

İlkeler:
- Verilen sayılara dayan; netleri, puanları ve kazanım sayılarını yeniden hesaplama, sayı uydurma.
- Somut ol: deneme adlarını, ders netlerindeki değişimi ve kazanım adlarını (tablodaki adlarıyla) an. "Daha çok çalışmalı" gibi genel cümleler kurma.
- Kazanım tablosu varsa analizin merkezinde o olsun: birden fazla denemede tekrar eden hatalar en önemli bulgudur. Kazanımları ilişkili gruplar halinde düşün (ör. aynı ünitenin parçaları), nedenini yorumla (kavram eksiği mi, işlem hatası mı, süre/boş bırakma mı: boş sayısı yüksekse süre ya da çekinme olabilir).
- Kurum ortalaması verilmişse öğrenciyi ortalamayla kıyasla.
- TYT, AYT ve LGS'yi birbiriyle kıyaslama; tek denemede trend için "Tek deneme, trend belirlenemedi" yaz.
- Konu ilerleyişi ve görüşme notları eksik olabilir; yalnızca verilenlere dayan. Görüşme notu yoksa capraz_degerlendirme null olsun.
- Çalışma planı uygulanabilir olsun: hangi kazanım, ne yapılacak (konu tekrarı, X adet soru, yanlış defteri, süre çalışması), hangi sırayla.
- ogrenciye_mesaj doğrudan öğrenciye "sen" diye hitap etsin; dürüst ama cesaretlendirici, 3-4 cümle. Görüşme notlarındaki özel bilgileri bu mesaja ve ders/kazanım yorumlarına taşıma.
${multi ? "- Birden fazla öğrenci var: her öğrenciyi ayrı değerlendir, karsilastirma alanında kısa bir kıyaslama yaz." : "- Tek öğrenci var: karsilastirma null olsun."}

Yalnızca geçerli JSON döndür (açıklama, markdown yok). Biçim:
{"ogrenciler":[{
  "student_name":"string",
  "genel_yorum":"4-6 cümlelik genel değerlendirme",
  "trend":"net ve puan gidişatı, 1-3 cümle",
  "guclu_dersler":["ders"],
  "zayif_dersler":["ders"],
  "ders_yorumlari":[{"ders":"string","yorum":"1-3 cümle"}],
  "kazanim_oncelikleri":[{"ders":"string","kazanim":"tablodaki adıyla","durum":"ör. 5 denemede 6 soru, 4 yanlış 1 boş","oneri":"somut çalışma önerisi"}],
  "guclu_kazanimlar":[{"ders":"string","kazanim":"string"}],
  "calisma_plani":["öncelik sırasıyla 4-7 madde"],
  "ogrenciye_mesaj":"string",
  "capraz_degerlendirme":"string veya null"
}],"karsilastirma":"string veya null"}
kazanim_oncelikleri en önemli 6-12 kazanımı, guclu_kazanimlar en fazla 8 kazanımı içersin.`;
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
    maxTokens: multi ? 6000 : 4500,
  });

  const parsed = parseJsonLoose<ExamAnalysisResult>(res.text);
  const list = Array.isArray(parsed?.ogrenciler) ? parsed.ogrenciler : [];
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  // Her öğrenciye kodda hesaplanan kazanım tablosu eklenir (yapay zekânın yazdığından bağımsız, kesin)
  const ogrenciler: StudentAnalysis[] = groups.map((g, i) => {
    const o = (list.find((x) => x?.student_name === g.studentName) ?? list[i] ?? {}) as Partial<StudentAnalysis>;
    const { zayif, guclu, withData } = aggregateKazanim(g.exams);
    const plan = arr<string>(o.calisma_plani).length ? arr<string>(o.calisma_plani) : arr<string>(o.oneriler);
    return {
      student_id: g.studentId,
      student_name: g.studentName,
      genel_yorum: String(o.genel_yorum ?? ""),
      trend: String(o.trend ?? ""),
      guclu_dersler: arr<string>(o.guclu_dersler),
      zayif_dersler: arr<string>(o.zayif_dersler),
      ders_yorumlari: arr(o.ders_yorumlari),
      kazanim_oncelikleri: withData ? arr(o.kazanim_oncelikleri) : [],
      guclu_kazanimlar: withData ? arr(o.guclu_kazanimlar) : [],
      calisma_plani: plan,
      oneriler: plan,
      ogrenciye_mesaj: String(o.ogrenciye_mesaj ?? ""),
      capraz_degerlendirme: g.meetings.length && o.capraz_degerlendirme ? String(o.capraz_degerlendirme) : null,
      kazanim_tablosu: { zayif: zayif.slice(0, 20), guclu: guclu.slice(0, 10), soru_verisi_olan_deneme: withData },
    };
  });

  return {
    ogrenciler,
    karsilastirma: multi && parsed?.karsilastirma ? String(parsed.karsilastirma) : null,
    kaynak: res.provider === "gemini" ? `Google Gemini (${res.model})` : `Groq (${res.model})`,
  };
}
