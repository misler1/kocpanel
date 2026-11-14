/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { EkipKayitlariClient } from './EkipKayitlariClient';

const sinceIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

// Ekip kayıtları: bana bağlı stajyer koç / yurt personelinin yaptığı ekleme, değişiklik ve silmeler (supabase/staff_activity.sql).
// Koçta yalnızca kendisine bağlı biri varsa açılır; yönetici isterse bütün personeli görür.
export default async function EkipKayitlariPage({ searchParams }: { searchParams: Promise<{ kisi?: string; gun?: string; tum?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const { kisi, gun, tum } = await searchParams;
  const supabase = await createClient();

  const [{ data: me }, { data: team }] = await Promise.all([
    (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    (supabase as any).from('teacher_access_profiles').select('teacher_id, status').eq('mentor_id', user.id).neq('status', 'coach'),
  ]);
  const isAdmin = !!me?.is_admin;
  const teamIds: string[] = ((team as any[]) ?? []).map((t) => t.teacher_id);
  if (!isAdmin && teamIds.length === 0) redirect('/anasayfa');

  const all = isAdmin && tum === '1';
  const days = [7, 30, 90].includes(Number(gun)) ? Number(gun) : 30;
  const since = sinceIso(days);

  let q = (supabase as any).from('staff_activity')
    .select('id, actor_id, actor_name, actor_status, student_id, student_name, area, action, summary, changes, link, created_at')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(1000);
  if (!all) q = q.eq('mentor_id', user.id);
  const { data: rows, error } = await q;

  const { data: names } = teamIds.length
    ? await (supabase as any).from('profiles').select('id, full_name').in('id', teamIds)
    : { data: [] };
  const statusOf = new Map(((team as any[]) ?? []).map((t) => [t.teacher_id, t.status]));
  const people = ((names as any[]) ?? []).map((p) => ({ id: p.id as string, name: (p.full_name ?? '') as string, status: (statusOf.get(p.id) ?? '') as string }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return (
    <EkipKayitlariClient
      rows={(rows as any[]) ?? []}
      missing={!!error}
      people={people}
      initialPerson={kisi ?? ''}
      days={days}
      isAdmin={isAdmin}
      all={all}
    />
  );
}
