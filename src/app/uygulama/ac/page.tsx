/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';

export const metadata: Metadata = {
  title: 'KoçDefterim',
  robots: { index: false, follow: false },
};

// Ana ekrandaki uygulama ikonunun açtığı adres (manifest start_url).
// Oturum açıksa kişi doğrudan kendi paneline gider; kapalıysa hangi girişi kullanacağını seçer.
export default async function UygulamaAcPage() {
  const user = await getRequestUser();
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).maybeSingle();
    redirect(profile?.role === 'ogrenci' ? '/ogrenci' : profile?.role === 'veli' ? '/veli' : '/anasayfa');
  }

  const options = [
    { href: '/giris/ogrenci', emoji: '🎒', title: 'Öğrenciyim', text: 'Programım, denemelerim, mesajlarım', cls: 'from-[#8B5CF6] to-[#EC4899]' },
    { href: '/giris', emoji: '🧑‍🏫', title: 'Koç / Öğretmenim', text: 'Öğrencilerim ve ajandam', cls: 'from-[#4F46E5] to-[#8B5CF6]' },
    { href: '/giris/veli', emoji: '👪', title: 'Veliyim', text: 'Çocuğumun gelişim raporu', cls: 'from-[#0D9488] to-[#0EA5E9]' },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F6FC] px-5 py-10">
      <Image src="/icon-192.png" alt="KoçDefterim" width={80} height={80} className="rounded-[22px] shadow-sm" priority />
      <h1 className="mt-4 text-[22px] font-extrabold text-[#1F1B2E]">KoçDefterim’e hoş geldin</h1>
      <p className="mt-1 text-[14.5px] text-[#6B6680]">Nasıl giriş yapacaksın?</p>
      <div className="mt-7 w-full max-w-sm space-y-3">
        {options.map((o) => (
          <Link key={o.href} href={o.href}
            className={`flex items-center gap-4 rounded-2xl bg-gradient-to-r ${o.cls} px-5 py-4 text-white shadow-sm transition-transform active:scale-[0.98]`}>
            <span className="text-[30px] leading-none">{o.emoji}</span>
            <span>
              <span className="block text-[16px] font-extrabold">{o.title}</span>
              <span className="block text-[13px] text-white/85">{o.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
