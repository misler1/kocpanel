/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { analyzeExams, type StudentExamGroup } from '@/lib/groq/examAnalysis';

type Body = {
  examIds?: string[];
  includeMeetings?: boolean;
};

export async function POST(req: Request) {
  try {
    const { examIds, includeMeetings = false }: Body = await req.json();

    if (!Array.isArray(examIds) || examIds.length === 0) {
      return Response.json({ error: 'Eksik veri' }, { status: 400 });
    }
    if (examIds.length > 5) {
      return Response.json({ error: 'En fazla 5 deneme analiz edilebilir.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

    const { data: exams, error: examsError } = await (supabase as any)
      .from('exams')
      .select('id, student_id, exam_name, exam_type, exam_date, net_score, subject_results, tyt_puan, say_puan, ea_puan, soz_puan, lgs_puan, linked_exam_id, students!inner(id, full_name, coach_id)')
      .in('id', examIds)
      .eq('students.coach_id', user.id);

    if (examsError) return Response.json({ error: examsError.message }, { status: 500 });
    if (!exams || exams.length === 0) {
      return Response.json({ error: 'Analiz edilecek deneme bulunamadı.' }, { status: 404 });
    }

    const orderedExams = examIds
      .map((id) => exams.find((exam: any) => exam.id === id))
      .filter(Boolean) as any[];

    const studentIds = Array.from(new Set(orderedExams.map((e: any) => e.student_id)));

    let meetingsByStudent = new Map<string, { date: string; notes: string }[]>();
    if (includeMeetings && studentIds.length > 0) {
      const { data: meetings } = await (supabase as any)
        .from('meetings')
        .select('student_id, scheduled_at, notes, topic')
        .in('student_id', studentIds)
        .order('scheduled_at', { ascending: false })
        .limit(Math.max(studentIds.length * 3, 3));

      meetingsByStudent = new Map();
      for (const meeting of meetings ?? []) {
        const arr = meetingsByStudent.get(meeting.student_id) ?? [];
        const notes = [meeting.topic, meeting.notes].filter(Boolean).join(' - ');
        if (notes.trim()) arr.push({ date: meeting.scheduled_at, notes: notes.slice(0, 220) });
        meetingsByStudent.set(meeting.student_id, arr.slice(0, 3));
      }
    }

    const { data: topics } = await (supabase as any)
      .from('topic_progress')
      .select('student_id, subject, topic, status, updated_at')
      .in('student_id', studentIds)
      .order('updated_at', { ascending: false })
      .limit(Math.max(studentIds.length * 24, 24));

    const topicsByStudent = new Map<string, { subject: string; topic: string; status: string; updatedAt: string }[]>();
    for (const topic of topics ?? []) {
      const arr = topicsByStudent.get(topic.student_id) ?? [];
      if (arr.length >= 18) continue;
      arr.push({
        subject: topic.subject,
        topic: topic.topic,
        status: topic.status,
        updatedAt: topic.updated_at,
      });
      topicsByStudent.set(topic.student_id, arr);
    }

    const byStudent = new Map<string, any[]>();
    for (const exam of orderedExams) {
      const arr = byStudent.get(exam.student_id) ?? [];
      arr.push(exam);
      byStudent.set(exam.student_id, arr);
    }

    const groups: StudentExamGroup[] = Array.from(byStudent.entries()).map(([studentId, studentExams]) => {
      const sorted = [...studentExams].sort((a, b) => (a.exam_date < b.exam_date ? -1 : a.exam_date > b.exam_date ? 1 : 0));
      return {
        studentId,
        studentName: sorted[0].students?.full_name ?? 'Öğrenci',
        exams: sorted.map((e: any) => ({
          id: e.id,
          exam_name: e.exam_name,
          exam_type: e.exam_type,
          exam_date: e.exam_date,
          net_score: String(e.net_score ?? ''),
          subject_results: e.subject_results ?? {},
          tyt_puan: e.tyt_puan ? String(e.tyt_puan) : null,
          say_puan: e.say_puan ? String(e.say_puan) : null,
          ea_puan: e.ea_puan ? String(e.ea_puan) : null,
          soz_puan: e.soz_puan ? String(e.soz_puan) : null,
          lgs_puan: e.lgs_puan ? String(e.lgs_puan) : null,
          linked_exam_id: e.linked_exam_id ?? null,
        })),
        meetings: meetingsByStudent.get(studentId) ?? [],
        topics: topicsByStudent.get(studentId) ?? [],
      };
    });

    const analysis = await analyzeExams(groups);
    return Response.json({ analysis });
  } catch (err) {
    console.error('Deneme analiz hatası:', err);
    const message = err instanceof Error ? err.message : 'Analiz başarısız oldu.';
    return Response.json({ error: message }, { status: 500 });
  }
}
