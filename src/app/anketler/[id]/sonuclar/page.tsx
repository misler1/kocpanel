/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const { data: responses } = await (supabase.from('survey_responses') as any)
    .select('*, students(full_name, track)')
    .eq('survey_id', id)
    .order('submitted_at', { ascending: false });

  const responseIds = (responses ?? []).map((r: any) => r.id);
  const { data: answers } = responseIds.length > 0
    ? await (supabase.from('survey_answers') as any).select('*').in('response_id', responseIds)
    : { data: [] };

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, track')
    .eq('coach_id', user.id)
    .neq('status', 'pasif')
    .order('full_name');

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