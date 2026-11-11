/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { analyzeExams, MAX_ANALYSIS_EXAMS, type StudentExamGroup, type StudyInput } from '@/lib/groq/examAnalysis';

// Yapay zekâ yanıtı uzun sürebilir (çok deneme + kazanım tablosu)
export const maxDuration = 60;

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
    if (examIds.length > MAX_ANALYSIS_EXAMS) {
      return Response.json({ error: `En fazla ${MAX_ANALYSIS_EXAMS} deneme analiz edilebilir.` }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

    const { data: exams, error: examsError } = await (supabase as any)
      .from('exams')
      .select('id, student_id, exam_name, exam_type, exam_date, net_score, subject_results, question_results, subject_averages, tyt_puan, say_puan, ea_puan, soz_puan, lgs_puan, linked_exam_id, student_analysis, students!inner(id, full_name, coach_id)')
      .in('id', examIds); // hangi denemelerin görülebileceğini veritabanı izni belirler (koç, yurt personeli)

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
        .limit(Math.max(studentIds.length * 6, 6));

      meetingsByStudent = new Map();
      for (const meeting of meetings ?? []) {
        const arr = meetingsByStudent.get(meeting.student_id) ?? [];
        const notes = [meeting.topic, meeting.notes].filter(Boolean).join(' - ');
        if (notes.trim()) arr.push({ date: meeting.scheduled_at, notes: notes.slice(0, 700) });
        meetingsByStudent.set(meeting.student_id, arr.slice(0, 5));
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

    // Denemelerden sonraki çalışmalar (günlükler): ders/konu bazında toplanır
    const firstDate = orderedExams.map((e: any) => e.exam_date).sort()[0];
    const { data: logs } = await (supabase as any)
      .from('daily_logs')
      .select('student_id, log_date, question_solved, topic_studies, archived')
      .in('student_id', studentIds)
      .gte('log_date', firstDate)
      .limit(3000);
    const studiesByStudent = new Map<string, Map<string, StudyInput>>();
    for (const l of logs ?? []) {
      if (l.archived) continue;
      const m = studiesByStudent.get(l.student_id) ?? new Map<string, StudyInput>();
      const add = (x: any, q: number, min: number) => {
        const subject = String(x?.subject ?? '').trim();
        if (!subject) return;
        const topic = String(x?.topic ?? '').trim();
        const key = `${subject}|${topic.toLocaleLowerCase('tr')}`;
        const cur = m.get(key) ?? { subject, topic, questions: 0, minutes: 0, lastDate: l.log_date };
        cur.questions += q; cur.minutes += min;
        if (l.log_date > cur.lastDate) cur.lastDate = l.log_date;
        m.set(key, cur);
      };
      for (const q of Array.isArray(l.question_solved) ? l.question_solved : []) add(q, Number(q?.count) || 0, 0);
      for (const t of Array.isArray(l.topic_studies) ? l.topic_studies : []) add(t, 0, Number(t?.duration_minutes) || 0);
      studiesByStudent.set(l.student_id, m);
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
          question_results: Array.isArray(e.question_results) ? e.question_results : null,
          subject_averages: e.subject_averages ?? null,
          tyt_puan: e.tyt_puan ? String(e.tyt_puan) : null,
          say_puan: e.say_puan ? String(e.say_puan) : null,
          ea_puan: e.ea_puan ? String(e.ea_puan) : null,
          soz_puan: e.soz_puan ? String(e.soz_puan) : null,
          lgs_puan: e.lgs_puan ? String(e.lgs_puan) : null,
          linked_exam_id: e.linked_exam_id ?? null,
          student_analysis: e.student_analysis ?? null,
        })),
        meetings: meetingsByStudent.get(studentId) ?? [],
        topics: topicsByStudent.get(studentId) ?? [],
        studies: Array.from(studiesByStudent.get(studentId)?.values() ?? [])
          .sort((a, b) => b.questions + b.minutes - (a.questions + a.minutes)).slice(0, 60),
      };
    });

    const analysis = await analyzeExams(groups);

    // Her öğrencinin analizi kaydedilir (öğrenciye göndermek için); tablo yoksa (SQL çalıştırılmadıysa) sessizce geçilir
    for (const o of analysis.ogrenciler) {
      const g = groups.find((x) => x.studentId === o.student_id);
      if (!g) continue;
      const { data: saved } = await (supabase as any).from('exam_analyses').insert({
        coach_id: user.id,
        student_id: g.studentId,
        exam_ids: g.exams.map((e) => e.id),
        exam_names: g.exams.map((e) => e.exam_name),
        exam_dates: g.exams.map((e) => e.exam_date),
        analysis: { ...o, karsilastirma: null, kaynak: analysis.kaynak },
      }).select('id').single();
      if (saved?.id) o.analiz_id = saved.id;
    }
    return Response.json({ analysis });
  } catch (err) {
    console.error('Deneme analiz hatası:', err);
    const message = err instanceof Error ? err.message : 'Analiz başarısız oldu.';
    return Response.json({ error: message }, { status: 500 });
  }
}
