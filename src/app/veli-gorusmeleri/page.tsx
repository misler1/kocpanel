/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VeliGorusmeleriClient } from './VeliGorusmeleriClient';

export default async function VeliGorusmeleriPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: rawMeetings } = await (supabase as any)
    .from('meetings')
    .select('*, students(full_name, track, kurum, donem)')
    .eq('coach_id', user.id)
    .eq('meeting_type', 'veli')
    .order('scheduled_at', { ascending: false });
  const meetings = (rawMeetings as any[]) ?? [];

  return <VeliGorusmeleriClient meetings={meetings} />;
}