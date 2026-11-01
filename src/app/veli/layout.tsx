import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VeliLogoutButton } from './VeliLogoutButton';

export const metadata: Metadata = { title: 'Veli Paneli | Koç Defterim', robots: { index: false, follow: false } };

export default async function VeliLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris/veli');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from('profiles').select('full_name, role').eq('id', user.id).single();
  if (profile?.role !== 'veli') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <header className="no-print border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/veli" aria-label="Veli paneli">
            <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={150} height={44} className="h-8 w-auto" priority />
          </Link>
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <span className="hidden sm:inline">{profile?.full_name}</span>
            <Link href="/veli/sifre-degistir" className="rounded-lg px-2.5 py-1.5 hover:bg-gray-100">Şifre</Link>
            <VeliLogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
