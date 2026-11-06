/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { KurulumClient } from './KurulumClient';

// Telefonla açılan personel hesabının ilk giriş adımları: 1) şifre değiştir 2) e-posta ekle
export default async function HesapKurulumuPage({ searchParams }: { searchParams: Promise<{ adim?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const { adim } = await searchParams;
  const supabase = await createClient();
  const { data: p } = await (supabase as any).from('profiles').select('full_name, role, email, must_change_password').eq('id', user.id).single();
  if (!p || p.role === 'ogrenci' || p.role === 'veli') redirect('/');
  const step = p.must_change_password ? 'sifre' : (adim === 'eposta' || !p.email) ? 'eposta' : null;
  if (!step) redirect('/anasayfa');
  return <KurulumClient name={p.full_name ?? ''} initialStep={step} currentEmail={p.email ?? ''} />;
}
