import { calcNetYKS, calcNetLGS } from "@/app/denemeler/examConstants";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- exams tablosunun gerçek şemasına göre tipler ---
export interface SubjectResultRaw {
  dogru: string; // "" olabilir (girilmemiş demek)
  yanlis: string;
}

export interface ExamRow {
  id: string;
  exam_name: string;
  exam_type: string; // "TYT" | "AYT" | "LGS" | ...
  exam_date: string;
  net_score: string; // numeric ama Supabase string döndürüyor
  subject_results: Record<string, SubjectResultRaw>;
  tyt_puan: string | null;
  say_puan: string | null;
  ea_puan: string | null;
  soz_puan: string | null;
  lgs_puan: string | null;
  linked_exam_id: string | null;
}

export interface MeetingInput {
  date: string;
  notes: string;
}

// topic_progress tablosundan gelen konu ilerleyişi verisi.
// DİKKAT: Bu veri hem EKSİK olabilir (koç her konuyu düzenli girmiyor olabilir)
// hem de deneme tarihiyle karşılaştırılırken dikkatli olunmalı — bkz. sistem promptu.
export interface TopicProgressInput {
  subject: string;
  topic: string;
  status: string; // 'baslanmadi' | 'devam' | 'tamamlandi'
  updatedAt: string;
}

// Bir öğrenciye ait denemeler + (varsa) görüşme notları + (varsa) konu ilerleyişi.
// Birden fazla öğrenci seçildiğinde route.ts bu tipten bir dizi oluşturup gönderir.
export interface StudentExamGroup {
  studentId: string;
  studentName: string;
  exams: ExamRow[];
  meetings: MeetingInput[];
  topics: TopicProgressInput[];
}

export interface StudentAnalysis {
  student_name: string;
  guclu_dersler: string[];
  zayif_dersler: string[];
  trend: string;
  capraz_degerlendirme: string | null;
  oneriler: string[];
}

export interface ExamAnalysisResult {
  ogrenciler: StudentAnalysis[];
  // Yalnızca birden fazla öğrenci seçildiğinde dolu olur; tek öğrencide null.
  karsilastirma: string | null;
}

// --- Net hesaplama: examConstants.ts'teki GERÇEK formülleri kullanıyoruz ---
// (LGS: 3 yanlış = 1 doğru götürür, TYT/AYT: 4 yanlış = 1 doğru götürür.
// Burada tekrar yazmıyoruz, tek kaynaktan (examConstants.ts) import ediyoruz
// ki ekranda görünen net ile AI'ın kullandığı net asla sapmasın.)
interface SubjectNet {
  dogru: number;
  yanlis: number;
  net: number;
}

function calculateSubjectNets(
  subjectResults: Record<string, SubjectResultRaw>,
  examType: string
): Record<string, SubjectNet> {
  const result: Record<string, SubjectNet> = {};

  for (const [subject, values] of Object.entries(subjectResults)) {
    const dogru = values.dogru?.trim() ? parseFloat(values.dogru) : NaN;
    const yanlis = values.yanlis?.trim() ? parseFloat(values.yanlis) : NaN;

    // İkisi de boşsa bu derse hiç girilmemiş, atla
    if (isNaN(dogru) && isNaN(yanlis)) continue;

    const d = isNaN(dogru) ? 0 : dogru;
    const y = isNaN(yanlis) ? 0 : yanlis;
    const net = examType === "LGS" ? calcNetLGS(d, y) : calcNetYKS(d, y);

    result[subject] = { dogru: d, yanlis: y, net };
  }

  return result;
}

function formatExamForPrompt(exam: ExamRow): string {
  const nets = calculateSubjectNets(exam.subject_results, exam.exam_type);
  const subjectLines = Object.entries(nets)
    .map(([subject, v]) => `    - ${subject}: D${v.dogru} Y${v.yanlis} N${v.net}`)
    .join("\n");

  const puanLines = [
    exam.tyt_puan ? `TYT Puanı: ${exam.tyt_puan}` : null,
    exam.say_puan ? `SAY Puanı: ${exam.say_puan}` : null,
    exam.ea_puan ? `EA Puanı: ${exam.ea_puan}` : null,
    exam.soz_puan ? `SÖZ Puanı: ${exam.soz_puan}` : null,
    exam.lgs_puan ? `LGS Puanı: ${exam.lgs_puan}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `  - ${exam.exam_name} (${exam.exam_type}, ${exam.exam_date}) — Toplam net: ${exam.net_score}${puanLines ? ` [${puanLines}]` : ""}
${subjectLines}`;
}

function formatTopicsForPrompt(topics: TopicProgressInput[]): string {
  if (topics.length === 0) return "";

  const statusLabel: Record<string, string> = {
    baslanmadi: "başlanmadı",
    devam: "devam",
    tamamlandi: "tamam",
  };

  const lines = topics.slice(0, 18).map((t) => {
    const label = statusLabel[t.status] ?? t.status;
    return `    - ${t.subject}/${t.topic}: ${label}, ${t.updatedAt.slice(0, 10)}`;
  });

  return `\n\n  KONU KAYITLARI (sınırlı, eksik olabilir):\n${lines.join("\n")}`;
}

function formatStudentGroupForPrompt(group: StudentExamGroup): string {
  const examSection = group.exams.map(formatExamForPrompt).join("\n\n");
  const meetingSection = group.meetings.length
    ? `\n\n  GÖRÜŞME NOTLARI:\n${group.meetings
        .slice(0, 3)
        .map((m) => `    - ${m.date.slice(0, 10)}: ${m.notes.slice(0, 220)}`)
        .join("\n")}`
    : "";
  const topicsSection = formatTopicsForPrompt(group.topics);

  return `ÖĞRENCİ: ${group.studentName}\n\n${examSection}${meetingSection}${topicsSection}`;
}

function parseAnalysisJson(content: string): ExamAnalysisResult {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) {
    throw new Error("Model boş analiz döndürdü. Lütfen tekrar deneyin.");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("Model geçerli JSON döndürmedi. Lütfen tekrar deneyin.");
  }
}
export async function analyzeExams(
  groups: StudentExamGroup[]
): Promise<ExamAnalysisResult> {
  if (groups.length === 0) {
    throw new Error("En az bir öğrenci/deneme seçilmeli.");
  }

  const totalExams = groups.reduce((sum, g) => sum + g.exams.length, 0);
  if (totalExams === 0) {
    throw new Error("En az bir deneme seçilmeli.");
  }
  if (totalExams > 5) {
    throw new Error("Toplamda en fazla 5 deneme analiz edilebilir.");
  }

  const isMultiStudent = groups.length > 1;

  const systemPrompt = `Sen Türkçe konuşan bir öğrenci koçluğu asistanısın. Deneme sonuçlarını kısa ve somut analiz et.
Sadece geçerli JSON döndür, açıklama veya markdown yazma.
Kurallar:
- Ders netleri verilmiştir; yeniden hesaplama.
- Her öğrenci için ayrı obje üret, öğrencileri karıştırma.
- Tek denemede trend için "Tek deneme, trend belirlenemedi" yaz.
- Farklı sınav türleri varsa bunu belirt, TYT/AYT/LGS'yi hatalı kıyaslama.
- Deneme verisi sadece ders düzeyindedir; alt konu uydurma.
- Konu kayıtları sınırlı ve eksik olabilir; sadece verilen konu kayıtlarına dayan.
- Görüşme notu yoksa capraz_degerlendirme null olsun.
- Öneriler kısa, uygulanabilir ve veriye dayalı olsun.
${
  isMultiStudent
    ? `- Birden fazla öğrenci varsa karsilastirma alanında kısa bir kıyaslama yaz.`
    : `- Tek öğrenci varsa karsilastirma alanını null yap.`
}
JSON formatı:
{"ogrenciler":[{"student_name":"string","guclu_dersler":["string"],"zayif_dersler":["string"],"trend":"string","capraz_degerlendirme":"string veya null","oneriler":["string"]}],"karsilastirma":"string veya null"}`;

  const userPrompt = groups.map(formatStudentGroupForPrompt).join("\n\n---\n\n");

  const requestBody = {
    model: "openai/gpt-oss-120b", // llama-3.3-70b-versatile 16 Ağustos 2026'da Groq tarafından kapatıldı
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: isMultiStudent ? 1200 : 900,
    reasoning_effort: "low",
  };

  async function requestAnalysis(useJsonMode: boolean) {
    return fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...requestBody,
        ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  }

  async function readAnalysisResponse(response: Response) {
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false as const, body, content: "" };
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true as const, body: "", content: typeof content === "string" ? content : JSON.stringify(content) };
  }

  let response = await requestAnalysis(true);
  let result = await readAnalysisResponse(response);

  if (!result.ok && response.status === 400 && result.body.includes("json_validate_failed")) {
    response = await requestAnalysis(false);
    result = await readAnalysisResponse(response);
  }

  if (result.ok && !result.content.trim()) {
    response = await requestAnalysis(false);
    result = await readAnalysisResponse(response);
  }

  if (!result.ok) {
    if (response.status === 413) {
      throw new Error("Analiz isteği çok büyüdü. Daha az deneme seçin veya görüşme notlarını dahil etmeden tekrar deneyin.");
    }
    throw new Error(`Groq API hatası: ${response.status} — ${result.body}`);
  }

  return parseAnalysisJson(result.content);
}