/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { PersonelClient, type StaffRow } from './PersonelClient';

export default async function PersonelPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const db = supabase as any;

  const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/ayarlar');

  const [{ data: studs }, { data: access }] = await Promise.all([
    db.from('students').select('kurum').eq('coach_id', user.id).neq('status', 'pasif'),
    db.from('teacher_access_profiles').select('teacher_id, status, title')
      .eq('mentor_id', user.id).in('status', ['dorm_manager', 'dorm_supervisor']),
  ]);

  const counts = new Map<string, number>();
  for (const s of (studs as any[]) ?? []) {
    const k = (s.kurum ?? '').trim();
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const kurumlar = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const ids = ((access as any[]) ?? []).map((a) => a.teacher_id);
  const { data: profs } = ids.length
    ? await db.from('profiles').select('id, full_name, phone, email, must_change_password').in('id', ids)
    : { data: [] };
  const byId = new Map(((profs as any[]) ?? []).map((p) => [p.id, p]));
  const staff: StaffRow[] = ((access as any[]) ?? []).map((a) => {
    const p = byId.get(a.teacher_id) ?? {};
    return {
      id: a.teacher_id, status: a.status, title: a.title, full_name: p.full_name ?? '—', phone: p.phone ?? null,
      email: p.email ?? null, pending: !!p.must_change_password,
    };
  }).sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));

  return <PersonelClient kurumlar={kurumlar} staff={staff} />;
}
