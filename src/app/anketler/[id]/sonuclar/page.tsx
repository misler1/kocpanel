/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';
import { SonuclarClient } from './SonuclarClient';

export default async function SonuclarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: survey } = await (supabase.from('surveys') as any)
    .select('*')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single();
  if (!survey) notFound();

  const { data: subjects } = await (supabase.from('survey_subjects') as any)
    .select('*, survey_topics(*)')
    .eq('survey_id', id)
    .order('sort_order');

  const { data: options } = survey.topic_option_template_question_id
    ? await (supabase.from('survey_options') as any)
        .select('*')
        .eq('question_id', survey.topic_option_template_question_id)
        .order('sort_order')
    : { data: [] };

  const { data: openQuestions } = await (supabase.from('survey_questions') as any)
    .select('*')
    .eq('survey_id', id)
    .eq('question_type', 'text');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: students } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, coach_id, responsible_coach_id, responsible_coach_other_name')
      .neq('status', 'pasif')
      .order('full_name'),
    scope
  );
  const visibleStudentIds = new Set(((students ?? []) as any[]).map((s: any) => s.id));

  const { data: rawResponses } = await (supabase.from('survey_responses') as any)
    .select('*, students(full_name, track, coach_id, responsible_coach_id, responsible_coach_other_name)')
    .eq('survey_id', id)
    .order('submitted_at', { ascending: false });
  const responses = (rawResponses ?? []).filter((r: any) => !r.student_id || visibleStudentIds.has(r.student_id));

  const responseIds = responses.map((r: any) => r.id);
  const { data: answers } = responseIds.length > 0
    ? await (supabase.from('survey_answers') as any).select('*').in('response_id', responseIds)
    : { data: [] };

  return (
    <SonuclarClient
      survey={survey}
      subjects={(subjects ?? []).map((s: any) => ({ ...s, topics: s.survey_topics ?? [] }))}
      options={options ?? []}
      openQuestions={openQuestions ?? []}
      responses={responses ?? []}
      answers={answers ?? []}
      students={students ?? []}
    />
  );
}
