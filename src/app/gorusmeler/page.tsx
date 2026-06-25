/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GorusmelerClient } from './GorusmelerClient';

export default async function GorusmelerPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string }>;
}) {
  const { ogrenci: ogrenciFilter } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  let query = (supabase as any)
    .from('meetings')
    .select('*, students(full_name, track)')
    .eq('coach_id', user.id)
    .order('scheduled_at', { ascending: false });

  if (ogrenciFilter) query = query.eq('student_id', ogrenciFilter);

  const { data: rawMeetings } = await query;

  const { data: rawStudents } = await (supabase as any)
    .from('students')
    .select('id, full_name')
    .eq('coach_id', user.id)
    .neq('status', 'pasif')
    .order('full_name');

  return (
    <GorusmelerClient
      initialMeetings={(rawMeetings as any[]) ?? []}
      students={(rawStudents as any[]) ?? []}
      initialFilter={ogrenciFilter}
    />
  );
}
