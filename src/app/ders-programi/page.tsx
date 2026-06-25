/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DersProgramiClient, { ProgramRow } from './DersProgramiClient';

export default async function DersProgramiPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string }>;
}) {
  const { ogrenci } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  // Aktif öğrencileri getir
  const { data: rawStudents } = await (supabase as any)
    .from('students')
    .select('id, full_name')
    .eq('coach_id', user.id)
    .neq('status', 'pasif')
    .order('full_name');

  const students = (rawStudents as any[]) ?? [];
  const firstId = ogrenci ?? students[0]?.id ?? '';

  // Seçili öğrencinin programını getir
  let initialRows: ProgramRow[] = [];
  if (firstId) {
    const { data } = await (supabase as any)
      .from('ders_programi')
      .select('*')
      .eq('student_id', firstId)
      .order('sira');
    initialRows = (data ?? []).map((r: any) => ({
      id: r.id,
      gun: r.gun,
      saat: r.saat ?? '',
      ders: r.ders ?? '',
      konu: r.konu ?? '',
      hedef: r.hedef ?? '',
    }));
  }

  return (
    <DersProgramiClient
      students={students.map((s: any) => ({ id: s.id, full_name: s.full_name }))}
      initialStudentId={firstId}
      initialRows={initialRows}
    />
  );
}
