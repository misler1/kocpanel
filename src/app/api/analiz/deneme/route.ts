import { createClient } from "@/lib/supabase/server";
import {
  analyzeExams,
  type ExamRow,
  type MeetingInput,
  type StudentExamGroup,
  type TopicProgressInput,
} from "@/lib/groq/examAnalysis";

// POST body: { examIds: string[], includeMeetings: boolean, includeTopics: boolean }
// Not: studentId artık gerekmiyor — denemeler kendi student_id'lerine göre
// otomatik gruplanıyor, böylece farklı öğrencilerin denemeleri aynı anda
// seçilip hem ayrı ayrı analiz edilebiliyor hem de aralarında kıyaslama yapılabiliyor.

interface ExamWithStudent extends ExamRow {
  student_id: string;
  students: { full_name: string } | null;
}

export async function POST(req: Request) {
  try {
    const { examIds, includeMeetings, includeTopics } = await req.json();

    if (!Array.isArray(examIds) || examIds.length === 0) {
      return Response.json(
        { error: "En az bir examId gerekli." },
        { status: 400 }
      );
    }
    if (examIds.length > 5) {
      return Response.json(
        { error: "Toplamda en fazla 5 deneme analiz edilebilir." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Oturum bulunamadı." }, { status: 401 });
    }

    const { data: examsData, error: examsError } = await supabase
      .from("exams")
      .select(
        "id, exam_name, exam_type, exam_date, net_score, subject_results, tyt_puan, say_puan, ea_puan, soz_puan, lgs_puan, linked_exam_id, student_id, students(full_name)"
      )
      .in("id", examIds)
      .order("exam_date", { ascending: true }); // trend için kronolojik sıra şart

    if (examsError) {
      throw new Error(`Denemeler alınamadı: ${examsError.message}`);
    }
    if (!examsData || examsData.length === 0) {
      return Response.json(
        { error: "Seçilen denemeler bulunamadı." },
        { status: 404 }
      );
    }
    // RLS bazı kayıtları filtrelemiş olabilir (örn. başka koça ait id gönderilmişse)
    // — sessizce yarım veriyle analiz yapmak yerine kullanıcıyı bilgilendir.
    if (examsData.length !== examIds.length) {
      return Response.json(
        { error: "Seçilen denemelerden bazılarına erişim yok." },
        { status: 403 }
      );
    }

    // numeric/string tip notu için bkz. examAnalysis.ts
    const exams = examsData as unknown as ExamWithStudent[];

    // Denemeleri öğrenciye göre grupla (Map ile eklenme sırası korunur)
    const groupsByStudent = new Map<string, StudentExamGroup>();
    for (const exam of exams) {
      const studentId = exam.student_id;
      if (!groupsByStudent.has(studentId)) {
        groupsByStudent.set(studentId, {
          studentId,
          studentName: exam.students?.full_name ?? "Bilinmeyen Öğrenci",
          exams: [],
          meetings: [],
          topics: [],
        });
      }
      groupsByStudent.get(studentId)!.exams.push(exam);
    }

    if (includeMeetings) {
      const studentIds = Array.from(groupsByStudent.keys());
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("student_id, scheduled_at, notes")
        .in("student_id", studentIds)
        .eq("completed", true) // sadece gerçekleşmiş görüşmelerin notu anlamlı
        .order("scheduled_at", { ascending: true });

      if (meetingsError) {
        throw new Error(`Görüşmeler alınamadı: ${meetingsError.message}`);
      }

      const meetingsRows = (meetingsData ?? []) as unknown as {
        student_id: string;
        scheduled_at: string;
        notes: string | null;
      }[];

      for (const m of meetingsRows) {
        if (!m.notes || m.notes.trim().length === 0) continue;
        const group = groupsByStudent.get(m.student_id);
        if (!group) continue;
        const meeting: MeetingInput = { date: m.scheduled_at, notes: m.notes };
        group.meetings.push(meeting);
      }
    }

    if (includeTopics) {
      const studentIds = Array.from(groupsByStudent.keys());
      const { data: topicsData, error: topicsError } = await supabase
        .from("topic_progress")
        .select("student_id, subject, topic, status, updated_at")
        .in("student_id", studentIds)
        .order("updated_at", { ascending: true });

      if (topicsError) {
        throw new Error(`Konu ilerleyişi alınamadı: ${topicsError.message}`);
      }

      const topicsRows = (topicsData ?? []) as unknown as {
        student_id: string;
        subject: string;
        topic: string;
        status: string;
        updated_at: string;
      }[];

      for (const t of topicsRows) {
        const group = groupsByStudent.get(t.student_id);
        if (!group) continue;
        const topic: TopicProgressInput = {
          subject: t.subject,
          topic: t.topic,
          status: t.status,
          updatedAt: t.updated_at,
        };
        group.topics.push(topic);
      }
    }

    const groups = Array.from(groupsByStudent.values());
    const analysis = await analyzeExams(groups);

    return Response.json({ analysis });
  } catch (err) {
    console.error("Deneme analizi hatası:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return Response.json({ error: message }, { status: 500 });
  }
}