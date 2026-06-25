/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HesabimClient } from './HesabimClient';

export default async function HesabimPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: profile } = await (supabase as any)
    .from('profiles').select('*').eq('id', user.id).single();

  return <HesabimClient profile={profile} userId={user.id} />;
}
