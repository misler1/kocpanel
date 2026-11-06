/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { OgrenciDuzenleClient } from './OgrenciDuzenleClient';
import { getStaffAccess } from '@/lib/staff-access';

export default async function OgrenciDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  // Yurt yöneticisi koçun öğrencisini düzenleyebilir (hangi öğrenciler olduğunu veritabanı izni belirler); belletmen düzenleyemez
  const access = await getStaffAccess(supabase, user.id);
  if (access.kind === 'belletmen') redirect(`/ogrenciler/${id}`);
  const staffMode = access.kind === 'manager';
  let q = (supabase as any).from('students').select('*').eq('id', id);
  if (!staffMode) q = q.eq('coach_id', user.id);
  const { data: student } = await q.single();

  if (!student) notFound();

  return <OgrenciDuzenleClient student={student} staffMode={staffMode} />;
}
