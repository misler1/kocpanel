/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DonemYonetimiClient } from './DonemYonetimiClient';

export default async function DonemlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: rawDonemler } = await (supabase as any)
    .from('donemler')
    .select('*')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: true });

  const { data: rawStudents } = await (supabase as any)
    .from('students')
    .select('id, full_name, track, kurum, donem, status')
    .eq('coach_id', user.id)
    .order('full_name');

  return (
    <DonemYonetimiClient
      initialDonemler={rawDonemler ?? []}
      initialStudents={rawStudents ?? []}
      coachId={user.id}
    />
  );
}