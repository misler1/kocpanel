import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AnketlerClient } from './AnketlerClient';

export default async function AnketlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: surveys } = await supabase
    .from('surveys')
    .select('*')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false });

  return <AnketlerClient initialSurveys={surveys ?? []} coachId={user.id} />;
}