/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { IconMessageReport } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { PageHero } from '@/components/ui/PageHero';
import { GeriBildirimlerClient } from './GeriBildirimlerClient';

// Yönetici: "Bize bildir" ile gelen sorunlar, öneriler ve mesajlar (supabase/geri_bildirim.sql)
export default async function GeriBildirimlerPage() {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const supabase = (await createClient()) as any;
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/ayarlar');
  const { data, error } = await supabase.rpc('feedback_admin_list');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHero theme="slate" icon={<IconMessageReport size={22} />} title="Geri bildirimler" />
      {error ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-[13px] text-gray-500">
          Geri bildirim sistemi henüz kurulmadı: supabase/geri_bildirim.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.
        </p>
      ) : (
        <GeriBildirimlerClient initial={data ?? []} />
      )}
    </div>
  );
}
