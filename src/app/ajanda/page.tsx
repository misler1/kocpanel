/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope } from '@/lib/supabase/request-cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyStudentScope } from '@/lib/effective-coach';
import { AjandaClient } from './AjandaClient';

// Ajanda: haftalık takvim. Koç/öğretmen istediği gün ve saate görüşme planlar;
// öğrenci ya da öğretmen/koç seçilirse ona panel içi bildirim gider (supabase/appointments.sql).
export default async function AjandaPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getRequestScope(user.id, includeInterns);
  const { data: students } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, kurum, donem, sinif_sube, coach_id, responsible_coach_id, responsible_coach_other_name')
      .neq('status', 'pasif')
      .order('full_name'),
    scope
  );

  // Davet edilebilecek öğretmen/koçlar (mesajlaşmadaki kuralla aynı: onaylı tüm koç ve öğretmenler).
  // Erişim yukarıda doğrulandı; profil listesi sunucuda okunur, tarayıcıya yalnızca ad ve rol gider.
  const admin = createAdminClient() as any;
  const { data: staff } = await admin.from('profiles')
    .select('id, full_name, role')
    .in('role', ['koc', 'ogretmen']).eq('is_approved', true).neq('id', user.id)
    .order('full_name');

  return (
    <AjandaClient
      meId={user.id}
      students={(students ?? []) as any[]}
      staff={(staff ?? []).map((p: any) => ({ id: p.id, full_name: p.full_name ?? '', role: p.role }))}
    />
  );
}
