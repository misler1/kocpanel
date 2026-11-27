/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { OtomasyonlarClient } from './OtomasyonlarClient';

export default async function OtomasyonlarPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const { data: profile, error } = await (supabase as any)
    .from('profiles').select('role, automation_prefs').eq('id', user.id).single();
  if (profile?.role === 'ogrenci' || profile?.role === 'veli') redirect('/ogrenci');

  const { count } = await (supabase as any)
    .from('students').select('id', { count: 'exact', head: true })
    .eq('coach_id', user.id).neq('status', 'pasif');

  return (
    <OtomasyonlarClient
      coachId={user.id}
      initialPrefs={(profile?.automation_prefs ?? {}) as Record<string, unknown>}
      ready={!error}
      activeStudents={count ?? 0}
    />
  );
}
