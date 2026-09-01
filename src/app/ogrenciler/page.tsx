import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgrencilerClient } from './OgrencilerClient';
import type { Student } from '@/types/database';

export default async function OgrencilerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('coach_id', user.id)
    .order('full_name');

  return <OgrencilerClient students={(students ?? []) as Student[]} />;
}