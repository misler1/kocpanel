/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope } from '@/lib/supabase/request-cache';
import { applyStudentScope } from '@/lib/effective-coach';
import { GunlukGirisClient } from './GunlukGirisClient';

// Öğrenci adına günlük takip girişi (yurtta öğrencilerin telefonu yok; belletmen girer). Veritabanı: belletmen_gunluk.sql
export default async function GunlukGirisPage({ searchParams }: { searchParams: Promise<{ ogrenci?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const { ogrenci } = await searchParams;
  const supabase = await createClient();
  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getRequestScope(user.id, includeInterns);
  const { data } = await applyStudentScope(
    (supabase as any).from('students').select('id, full_name, sinif_sube').neq('status', 'pasif').order('full_name'),
    scope
  );
  const students = ((data as any[]) ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string, sinif_sube: (s.sinif_sube ?? null) as string | null }));
  return <GunlukGirisClient students={students} initialStudentId={students.some((s) => s.id === ogrenci) ? ogrenci! : students[0]?.id ?? ''} />;
}
