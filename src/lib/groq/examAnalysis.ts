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
    .map(([subject, v]) => `      - ${subject}: ${v.dogru} doğru, ${v.yanlis} yanlış → net ${v.net}`)
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

  const bySubject = new Map<string, TopicProgressInput[]>();
  for (const t of topics) {
    if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
    bySubject.get(t.subject)!.push(t);
  }

  const statusLabel: Record<string, string> = {
    baslanmadi: "başlanmadı",
    devam: "devam ediyor",
    tamamlandi: "tamamlandı",
  };

  const lines: string[] = [];
  for (const [subject, subjectTopics] of bySubject) {
    lines.push(`    ${subject}:`);
    for (const t of subjectTopics) {
      const label = statusLabel[t.status] ?? t.status;
      lines.push(`      - ${t.topic}: durum "${label}" (son güncelleme: ${t.updatedAt})`);
    }
  }

  return `\n\n  KONU İLERLEYİŞİ (ders bazlı, tarihli — EKSİK olabilir, her konu düzenli girilmemiş olabilir):\n${lines.join("\n")}`;
}

function formatStudentGroupForPrompt(group: StudentExamGroup): string {
  const examSection = group.exams.map(formatExamForPrompt).join("\n\n");
  const meetingSection = group.meetings.length
    ? `\n\n  GÖRÜŞME NOTLARI:\n${group.meetings
        .map((m) => `    - ${m.date}: ${m.notes.slice(0, 500)}`)
        .join("\n")}`
    : "";
  const topicsSection = formatTopicsForPrompt(group.topics);

  return `ÖĞRENCİ: ${group.studentName}\n\n${examSection}${meetingSection}${topicsSection}`;
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

  const systemPrompt = `Sen bir Türk öğrenci koçluk uygulaması için deneme sonuçlarını analiz ediyorsun.
Koça, öğrenci(ler)in deneme performansı hakkında JSON formatında bir değerlendirme sun.

KURALLAR:
- Sadece JSON döndür, başka hiçbir şey yazma
- Ders bazlı net değerleri sana zaten hesaplanmış olarak veriliyor, tekrar hesaplama, olduğu gibi kullan
- Her öğrenci için "ogrenciler" dizisinde AYRI bir obje oluştur, öğrencilerin verilerini birbirine karıştırma
- Bir öğrencinin birden fazla denemesi varsa (kronolojik sırayla verilir) trend (gelişim/gerileme) belirle; tek denemesi varsa trend alanına "Tek deneme, trend belirlenemedi" yaz
- Farklı sınav türleri (TYT/AYT/LGS) aynı öğrenci için karışık verilmişse bunu belirt, birbirine karıştırıp yanlış kıyaslama yapma
- Bir öğrencinin görüşme notu verilmemişse o öğrencinin capraz_degerlendirme alanını null yap
- Görüşme notu verilmişse, notlarda geçen konuların (motivasyon düşüklüğü, belirli bir derste zorlanma, sınav kaygısı vb.) o öğrencinin deneme sonuçlarına yansıyıp yansımadığını değerlendir
- ÖNEMLİ — VERİ SINIRI: Deneme sonuçlarında sadece DERS SEVİYESİNDE net (doğru/yanlış sayıları) var, denemenin kendisinde hangi ALT KONUDAN yanlış yapıldığına dair veri YOK.
- Bazı öğrenciler için ayrıca "KONU İLERLEYİŞİ" verisi gelebilir (ders + konu + durum + tarih). Bu geldiğinde konu bazlı yorum yapabilirsin, gelmediğinde ASLA konu adı uydurma — sadece ders adını kullan.
- KONU İLERLEYİŞİ verildiğinde şu TARİH KURALINA kesinlikle uy: bir konunun "son güncelleme" tarihi, ilgili denemenin tarihinden SONRAYSA, o konuyu o denemedeki yanlışlarla ASLA ilişkilendirme — çünkü konu muhtemelen denemeden SONRA çalışılmış, denemedeki yanlışın sebebi olamaz. Sadece "son güncelleme" tarihi denemenin tarihiyle AYNI veya ONDAN ÖNCEKİ konuları o deneme ile ilişkilendirebilirsin.
- KONU İLERLEYİŞİ verisi EKSİK olabilir (koç her konuyu düzenli girmemiş olabilir). Listede olmayan bir konu için "bu konu hiç çalışılmadı" gibi kesin bir iddiada bulunma — sadece elindeki (girilmiş) kayıtlara dayanarak, pozitif veriden yorum yap.
- Öneriler somut ve uygulanabilir olsun ama SADECE elindeki veriye dayansın: soru hacmi, hata oranı (yanlış/doğru dengesi), tekrar sıklığı, deneme türleri arası tutarlılık, (varsa ve tarih kuralına uygunsa) konu ilerleyiş durumu gibi gözlemler üzerinden öneri ver. Konu ilerleyişi verisi yoksa veya tarih uyuşmuyorsa, hangi konuya çalışılması gerektiğini söylemek yerine koçun öğrenciyle görüşüp zayıf konuyu netleştirmesini öner.
- guclu_dersler ve zayif_dersler net değerlerine göre belirlensin; veri girilmemiş (boş) dersleri değerlendirmeye katma
${
  isMultiStudent
    ? `- Birden fazla öğrenci var: "karsilastirma" alanına öğrencileri birbirine göre kıyaslayan, farklarını ve dikkat çeken noktaları vurgulayan bir değerlendirme yaz (örn. hangisi hangi derste daha güçlü, aralarındaki net farkı ne anlama gelebilir vb.)`
    : `- Tek öğrenci var: "karsilastirma" alanını null yap`
}

DÖNDÜRÜLECEK FORMAT:
{
  "ogrenciler": [
    {
      "student_name": "string",
      "guclu_dersler": ["Matematik", "Geometri"],
      "zayif_dersler": ["Türkçe"],
      "trend": "string",
      "capraz_degerlendirme": "string veya null",
      "oneriler": ["string", "string"]
    }
  ],
  "karsilastirma": "string veya null"
}`;

  const userPrompt = groups.map(formatStudentGroupForPrompt).join("\n\n---\n\n");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b", // llama-3.3-70b-versatile 16 Ağustos 2026'da Groq tarafından kapatıldı
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: isMultiStudent ? 3000 : 1800, // konu ilerleyişi verisi eklenince çıktı biraz uzayabilir
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Groq API hatası: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`JSON parse hatası: ${content}`);
  }
}