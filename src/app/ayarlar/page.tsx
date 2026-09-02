import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  IconUser, IconUsers, IconBell, IconLock, IconChevronRight, IconCalendar, IconShield,
} from '@tabler/icons-react';
import { OgretmenYonetimiClient } from './OgretmenYonetimiClient';

export default async function AyarlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  // Admin mi kontrol et
  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

const profile = profileData as { is_admin: boolean } | null;

  const isAdmin = profile?.is_admin ?? false;

  // Admin ise tüm öğretmenleri çek
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let teachers: any[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, is_approved, is_admin, created_at, email')
      .order('created_at', { ascending: false });
    teachers = data ?? [];
  }

  const SECTIONS = [
    {
      title: 'Hesap',
      items: [
        { label: 'Profil bilgileri', desc: 'Ad, telefon ve rol bilgileri', icon: IconUser, href: '/hesabim' },
        { label: 'Şifre değiştir', desc: 'Hesap güvenliği', icon: IconLock, href: '#' },
      ],
    },
    {
      title: 'Öğrenciler',
      items: [
        { label: 'Öğrenci listesi', desc: 'Tüm öğrencileri yönet', icon: IconUsers, href: '/ogrenciler' },
        { label: 'Dönem yönetimi', desc: 'Yeni dönem aç, öğrencileri taşı', icon: IconCalendar, href: '/ayarlar/donemler' },
      ],
    },
    {
      title: 'Bildirimler',
      items: [
        { label: 'Bildirim tercihleri', desc: 'Yakında', icon: IconBell, href: '#' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5">
        <h1 className="text-[18px] font-medium text-gray-900">Ayarlar</h1>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 px-1 text-[12px] font-medium uppercase tracking-wide text-gray-400">
              {section.title}
            </h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Icon size={16} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-900">{item.label}</div>
                      <div className="text-[12px] text-gray-500">{item.desc}</div>
                    </div>
                    <IconChevronRight size={16} className="flex-shrink-0 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin paneli */}
        {isAdmin && (
          <div>
            <h2 className="mb-2 px-1 text-[12px] font-medium uppercase tracking-wide text-gray-400">
              Yönetim
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <IconShield size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-900">Öğretmen Yönetimi</div>
                  <div className="text-[12px] text-gray-500">Kayıt olan öğretmenleri onayla veya reddet</div>
                </div>
              </div>
              <OgretmenYonetimiClient teachers={teachers} currentUserId={user.id} />
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[12px] text-gray-400">KoçPanel · v0.1.0</p>
    </div>
  );
}