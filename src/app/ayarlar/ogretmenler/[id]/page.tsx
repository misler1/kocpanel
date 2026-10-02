import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgretmenIzinleriClient } from './OgretmenIzinleriClient';

export default async function OgretmenIzinleriPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!currentProfile?.is_admin) redirect('/ayarlar');

  const { data: teacher } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', id)
    .single();

  if (!teacher) notFound();

  const { data: mentors } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'koc')
    .eq('is_approved', true)
    .neq('id', id)
    .order('full_name');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accessProfile } = await (supabase.from('teacher_access_profiles') as any)
    .select('status, mentor_id')
    .eq('teacher_id', id)
    .maybeSingle();

  const mentorIds = (mentors ?? []).map((mentor) => mentor.id);

  const { data: students } = mentorIds.length > 0
    ? await supabase
      .from('students')
      .select('id, coach_id, full_name, kurum, sinif_sube')
      .in('coach_id', mentorIds)
      .neq('status', 'pasif')
      .order('full_name')
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pagePermissions } = await (supabase.from('teacher_page_permissions') as any)
    .select('page, enabled, allowed_kurums, allowed_classes, excluded_student_ids, scopes')
    .eq('teacher_id', id);

  return (
    <OgretmenIzinleriClient
      teacher={teacher}
      mentors={mentors ?? []}
      students={students ?? []}
      accessProfile={accessProfile ?? null}
      pagePermissions={pagePermissions ?? []}
    />
  );
}