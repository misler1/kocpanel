/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';
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

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: students } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, kurum, coach_id, responsible_coach_id, responsible_coach_other_name')
      .eq('id', id),
    scope
  );
  const student = students?.[0] ?? null;

  if (!student) notFound();

  const { data: meetings, error: meetingsError } = await (supabase as any)
    .from('meetings')
    .select('*')
    .eq('student_id', id)
    .order('scheduled_at', { ascending: false });

  if (meetingsError) {
    console.error('MEETINGS SORGU HATASI:', meetingsError);
  }

  const creatorIds = Array.from(
    new Set((meetings ?? []).map((m: any) => m.created_by).filter(Boolean))
  );
  let profilesById: Record<string, { id: string; full_name: string }> = {};
  if (creatorIds.length > 0) {
    const { data: creatorProfiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);
    profilesById = Object.fromEntries((creatorProfiles ?? []).map((p: any) => [p.id, p]));
  }

  const meetingsWithCreator = (meetings ?? []).map((m: any) => ({
    ...m,
    created_by_profile: m.created_by ? (profilesById[m.created_by] ?? null) : null,
  }));

  return <GorusmeOgrenciClient student={student} initialMeetings={meetingsWithCreator} />;
}
