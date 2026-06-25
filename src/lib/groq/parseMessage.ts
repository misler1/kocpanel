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
- Süreleri dakikaya çevir (2 saat = 120, 1.5 saat = 90)
- Kitap ismi belirtilmemişse lastBookName kullan: "${lastBookName || 'Bilinmiyor'}"
- Ders isimlerini standartlaştır: Matematik, Türkçe, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Edebiyat, İngilizce, Felsefe, Din, Geometri
- Soru sayısı belirtilmemişse 0 yaz
- Süre belirtilmemişse 0 yaz

DÖNDÜRÜLECEK FORMAT:
{
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
}`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API hatası: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`JSON parse hatası: ${content}`);
  }
}