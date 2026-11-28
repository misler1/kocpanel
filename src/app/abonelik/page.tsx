/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { IconCreditCard } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestBilling } from '@/lib/supabase/request-cache';
import { PageHero } from '@/components/ui/PageHero';
import { AbonelikClient } from './AbonelikClient';
import type { BillingSettings } from '@/lib/billing';

export default async function AbonelikPage() {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const supabase = await createClient();
  const [billing, { data: settings }, { data: payments }] = await Promise.all([
    getRequestBilling(),
    (supabase as any).from('billing_settings').select('*').eq('id', 1).maybeSingle(),
    (supabase as any).from('billing_payments')
      .select('id, kind, org_name, tier_max, coach_count, student_count, period, amount, status, admin_note, created_at, decided_at')
      .eq('profile_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHero theme="slate" icon={<IconCreditCard size={22} />} title="Abonelik" />
      {!billing || !settings ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-[13px] text-gray-500">
          Abonelik sistemi henüz kurulmadı (supabase/abonelik.sql çalıştırılmalı).
        </p>
      ) : (
        <AbonelikClient billing={billing} settings={settings as BillingSettings} payments={payments ?? []} />
      )}
    </div>
  );
}
