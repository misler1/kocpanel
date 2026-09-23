const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface TopicStudy {
  subject: string;
  topic: string;
  duration_minutes: number;
}

export interface QuestionSolved {
  subject: string;
  topic: string;
  count: number;
}

export interface ExamResult {
  exam_name: string;
  subject: string;
  net: number;
}

export interface BookReading {
  book_name: string;
  pages: number;
}

export interface ParsedDailyLog {
  // true: mesaj bir günlük çalışma raporu (konu/soru/deneme/kitap bilgisi içeriyor)
  // false: mesaj genel sohbet/soru (selamlaşma, görüşme saati sorma vb.) — bu durumda
  // diğer tüm alanlar boş döner ve webhook hiçbir şey kaydetmemeli.
  is_study_log: boolean;
  topic_studies: TopicStudy[];
  question_solved: QuestionSolved[];
  exams: ExamResult[];
  book_reading: BookReading[];
}

export async function parseWhatsAppMessage(
  message: string,
  lastBookName?: string
): Promise<ParsedDailyLog> {
  const systemPrompt = `Sen bir Türk öğrenci koçluk uygulaması için mesaj parse ediyorsun.
Öğrencinin WhatsApp mesajını analiz et ve JSON formatında döndür.

KURALLAR:
- Sadece JSON döndür, başka hiçbir şey yazma
- ÖNCE karar ver: Bu mesaj bir GÜNLÜK ÇALIŞMA RAPORU mu (konu çalışması, soru çözümü, deneme sonucu veya kitap okuma bilgisi içeriyor mu)? Yoksa GENEL SOHBET/SORU mu (selamlaşma, görüşme saati sorma, teşekkür, günlük çalışmayla ilgisi olmayan herhangi bir mesaj)?
  - Çalışma bilgisi içeriyorsa: "is_study_log": true yap ve ilgili alanları doldur
  - İçermiyorsa: "is_study_log": false yap ve TÜM dizileri boş bırak ([])
  - Emin olamadığın durumlarda (mesajda en ufak bir çalışma/soru/deneme/kitap ibaresi varsa) is_study_log: true tarafına eğil, tamamen alakasız görünen mesajlarda (örn. "Hocam yarın kaçta görüşelim", "Teşekkürler hocam", "Günaydın") false yap
- Süreleri dakikaya çevir (2 saat = 120, 1.5 saat = 90)
- Kitap ismi belirtilmemişse lastBookName kullan: "${lastBookName || 'Bilinmiyor'}"
- Ders isimlerini standartlaştır: Matematik, Türkçe, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Edebiyat, İngilizce, Felsefe, Din, Geometri
- Soru sayısı belirtilmemişse 0 yaz
- Süre belirtilmemişse 0 yaz

DÖNDÜRÜLECEK FORMAT:
{
  "is_study_log": true,
  "topic_studies": [
    {"subject": "Matematik", "topic": "Üslü Sayılar", "duration_minutes": 120}
  ],
  "question_solved": [
    {"subject": "Türkçe", "topic": "Paragraf", "count": 20}
  ],
  "exams": [
    {"exam_name": "TYT Denemesi", "subject": "TYT", "net": 85.5}
  ],
  "book_reading": [
    {"book_name": "İnsan Ne İle Yaşar", "pages": 15}
  ]
}

Sohbet mesajı örneği (is_study_log: false ise tüm diziler boş kalır):
{
  "is_study_log": false,
  "topic_studies": [],
  "question_solved": [],
  "exams": [],
  "book_reading": []
}`;

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
        { role: "user", content: message },
      ],
      temperature: 0.1,
      max_tokens: 1000,
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