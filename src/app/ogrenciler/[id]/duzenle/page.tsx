/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgrenciDuzenleClient } from './OgrenciDuzenleClient';

export default async function OgrenciDuzenlePage({
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
    .select('*')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single();

  if (!student) notFound();

  return <OgrenciDuzenleClient student={student} />;
}
