/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GorusmeOgrenciClient } from './GorusmeOgrenciClient';

export default async function GorusmeOgrenciPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: student } = await (supabase as any)
    .from('students')
    .select('id, full_name')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single();

  if (!student) notFound();

  const { data: meetings } = await (supabase as any)
    .from('meetings')
    .select('*')
    .eq('student_id', id)
    .eq('coach_id', user.id)
    .order('scheduled_at', { ascending: false });

  return <GorusmeOgrenciClient student={student} initialMeetings={meetings ?? []} />;
}