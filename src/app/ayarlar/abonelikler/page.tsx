/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { IconCreditCard } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { PageHero } from '@/components/ui/PageHero';
import { AboneliklerClient } from './AboneliklerClient';

// Yönetici: abonelikler, ödeme onayları, kurumlar, fiyat ve banka ayarları (supabase/abonelik.sql)
export default async function AboneliklerPage() {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const supabase = (await createClient()) as any;
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/ayarlar');

  const [accounts, orgs, payments, settings] = await Promise.all([
    supabase.rpc('billing_admin_list'),
    supabase.rpc('billing_admin_orgs'),
    supabase.rpc('billing_admin_payments', { p_status: null }),
    supabase.from('billing_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero theme="slate" icon={<IconCreditCard size={22} />} title="Abonelikler" />
      {accounts.error || !settings.data ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-[13px] text-gray-500">
          Abonelik sistemi henüz kurulmadı: supabase/abonelik.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.
          {accounts.error ? <span className="mt-1 block text-[12px] text-gray-400">{accounts.error.message}</span> : null}
        </p>
      ) : (
        <AboneliklerClient accounts={accounts.data ?? []} orgs={orgs.data ?? []} payments={payments.data ?? []} settings={settings.data} />
      )}
    </div>
  );
}
