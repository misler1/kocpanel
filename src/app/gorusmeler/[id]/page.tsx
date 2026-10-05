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
    .select('id, full_name, kurum')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single();

  if (!student) notFound();

  const { data: meetings, error: meetingsError } = await (supabase as any)
    .from('meetings')
    .select('*')
    .eq('student_id', id)
    .eq('coach_id', user.id)
    .order('scheduled_at', { ascending: false });

  if (meetingsError) {
    console.error('MEETINGS SORGU HATASI:', meetingsError);
  }

  // created_by_profile join'i şema önbelleğinde foreign key bulunamadığı için başarısız
  // oluyordu — bunun yerine profilleri ayrı çekip elle eşleştiriyoruz.
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