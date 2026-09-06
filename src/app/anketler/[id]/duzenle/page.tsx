import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DuzenleClient } from './DuzenleClient';

export default async function AnketDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: survey } = await (supabase.from('surveys') as any)
    .select('*')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single();
  if (!survey) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjects } = await (supabase.from('survey_subjects') as any)
    .select('*, survey_topics(*)')
    .eq('survey_id', id)
    .order('sort_order');

  const { data: options } = survey.topic_option_template_question_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from('survey_options') as any)
        .select('*')
        .eq('question_id', survey.topic_option_template_question_id)
        .order('sort_order')
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openQuestions } = await (supabase.from('survey_questions') as any)
    .select('*')
    .eq('survey_id', id)
    .eq('question_type', 'text')
    .order('sort_order');

  return (
    <DuzenleClient
      survey={survey}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSubjects={(subjects ?? []).map((s: any) => ({ ...s, topics: s.survey_topics ?? [] }))}
      initialOptions={options ?? []}
      initialOpenQuestions={openQuestions ?? []}
    />
  );
}