import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { MessagesApp } from '@/components/messages/MessagesApp';

export default async function MesajlarPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'ogrenci') redirect('/ogrenci/mesajlar');

  return (
    <div className="mx-auto max-w-6xl">
      <Suspense>
        <MessagesApp variant="coach" meId={user.id} isStaff={profile?.role === 'koc' || profile?.role === 'ogretmen'} />
      </Suspense>
    </div>
  );
}
