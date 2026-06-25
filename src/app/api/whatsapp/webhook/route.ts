import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppMessage } from "@/lib/groq/parseMessage";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface Student {
  id: string;
  coach_id: string;
  full_name: string;
}

interface LastLog {
  book_reading: { book_name: string; pages: number }[];
}

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;

// Meta webhook doğrulama (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Mesaj geldiğinde (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta'nın gönderdiği yapıdan mesajı çıkar
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "text") {
      return NextResponse.json({ status: "ignored" });
    }

    const phoneNumber = message.from; // örn: "905551234567"
    const messageText = message.text.body;

    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

    // Telefon numarasına göre öğrenciyi bul
    // Meta +90 olmadan gönderir, biz hem 05xx hem 905xx formatını deneyelim
    // Numarayı sadece rakamlardan oluşan hale getir
const digitsOnly = phoneNumber.replace(/\D/g, "");

// Tüm olası formatları üret
const phoneVariants = [
  digitsOnly,                          // 905516909393
  "+" + digitsOnly,                    // +905516909393
  "0" + digitsOnly.slice(2),           // 05516909393
  digitsOnly.slice(2),                 // 5516909393
].join(",");

const last10 = digitsOnly.slice(-10); // her zaman son 10 hane: 5516909393

const orFilter = [
  `phone.eq.${digitsOnly}`,           // 905516909393
  `phone.eq.+${digitsOnly}`,          // +905516909393
  `phone.eq.0${last10}`,              // 05516909393
  `phone.eq.${last10}`,               // 5516909393
  `phone.eq.+90${last10}`,            // +905516909393
].join(",");

console.log("orFilter:", orFilter);
console.log("digitsOnly:", digitsOnly);
console.log("last10:", last10);

const { data: studentData, error: studentError } = await supabase
  .from("students")
  .select("id, coach_id, full_name")
  .or(orFilter)
  .single();

console.log("studentData:", studentData);
console.log("studentError:", studentError);

const student = studentData as Student | null;

    if (!student) {
      console.log(`Tanınmayan numara: ${phoneNumber}`);
      return NextResponse.json({ status: "student_not_found" });
    }

    // Son okunan kitabı bul (book_name için)
    const { data: lastLogData } = await supabase
    .from("daily_logs")
    .select("book_reading")
    .eq("student_id", student!.id)
    .not("book_reading", "eq", "[]")
    .order("log_date", { ascending: false })
    .limit(1)
    .single();

const lastLog = lastLogData as LastLog | null;

    const lastBook = lastLog?.book_reading?.[0]?.book_name;

    // Groq ile parse et
    const parsed = await parseWhatsAppMessage(messageText, lastBook);

    // Günlüğe yaz (aynı gün varsa üstüne yaz)
    const today = new Date().toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("daily_logs") as any).upsert(
      {
        student_id: student.id,
        coach_id: student.coach_id,
        log_date: today,
        raw_message: messageText,
        topic_studies: parsed.topic_studies,
        question_solved: parsed.question_solved,
        exams: parsed.exams,
        book_reading: parsed.book_reading,
        source: "whatsapp",
      },
      { onConflict: "student_id,log_date" }
    );

    if (error) throw error;

    // WhatsApp'a onay mesajı gönder
    await sendWhatsAppMessage(
      phoneNumber,
      formatConfirmation(student.full_name, parsed)
    );

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook hatası:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

// Onay mesajı formatla
function formatConfirmation(
  studentName: string,
  parsed: Awaited<ReturnType<typeof parseWhatsAppMessage>>
): string {
  const lines: string[] = [`✅ *${studentName}* günlüğü kaydedildi!\n`];

  if (parsed.topic_studies.length > 0) {
    lines.push("📚 *Konu Çalışma*");
    parsed.topic_studies.forEach((t) => {
      const saat = t.duration_minutes >= 60
        ? `${Math.floor(t.duration_minutes / 60)} saat${t.duration_minutes % 60 ? ` ${t.duration_minutes % 60} dk` : ""}`
        : `${t.duration_minutes} dk`;
      lines.push(`• ${t.topic} — ${saat}`);
    });
    lines.push("");
  }

  if (parsed.question_solved.length > 0) {
    lines.push("✏️ *Soru Çözümü*");
    parsed.question_solved.forEach((q) => {
      lines.push(`• ${q.topic} — ${q.count} soru`);
    });
    lines.push("");
  }

  if (parsed.exams.length > 0) {
    lines.push("📝 *Deneme*");
    parsed.exams.forEach((e) => {
      lines.push(`• ${e.exam_name} — ${e.net} net`);
    });
    lines.push("");
  }

  if (parsed.book_reading.length > 0) {
    lines.push("📖 *Kitap Okuma*");
    parsed.book_reading.forEach((b) => {
      lines.push(`• ${b.book_name} — ${b.pages} sayfa`);
    });
  }

  return lines.join("\n");
}

// WhatsApp mesajı gönder
async function sendWhatsAppMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

  await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
}