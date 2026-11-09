import {
  IconHome,
  IconUsers,
  IconNotes,
  IconChecklist,
  IconBooks,
  IconChartBar,
  IconUsersGroup,
  IconSettings,
  IconUserCircle,
  IconMessageCircle,
  IconClipboardList,
  IconDatabase,
  IconCalendarWeek,
} from '@tabler/icons-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof IconHome;
  section?: string;
  badge?: number;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/anasayfa', label: 'Ana sayfa', icon: IconHome },
  { href: '/ogrenciler', label: 'Öğrenciler', icon: IconUsers },
  { href: '/gunluk-giris', label: 'Günlük takip', icon: IconChecklist }, // yalnızca kurum personeli (staff-access.ts)
  { href: '/ajanda', label: 'Ajanda', icon: IconCalendarWeek },
];

export const TAKIP_NAV: NavItem[] = [
  { href: '/gorusmeler', label: 'Görüşme kayıtları', icon: IconNotes, section: 'Takip' },
  { href: '/haftalik-takip', label: 'Haftalık Takip', icon: IconChecklist },
  { href: '/konu-ilerleyisi', label: 'Konu ilerleyişi', icon: IconBooks },
  { href: '/denemeler', label: 'Deneme sonuçları', icon: IconChartBar },
  { href: '/anketler', label: 'Anketler', icon: IconClipboardList },
];

export const BAGLANTI_NAV: NavItem[] = [
  { href: '/veli-gorusmeleri', label: 'Veli görüşmeleri', icon: IconUsersGroup, section: 'Bağlantı' },
  { href: '/mesajlar', label: 'Mesajlar', icon: IconMessageCircle },
];

export const YONETIM_NAV: NavItem[] = [
  { href: '/kazanim-havuzu', label: 'Kazanım havuzu', icon: IconDatabase, section: 'Yönetim' },
];

export const HESAP_NAV: NavItem[] = [
  { href: '/ayarlar', label: 'Ayarlar', icon: IconSettings, section: 'Hesap' },
  { href: '/hesabim', label: 'Hesabım', icon: IconUserCircle },
];

export const ALL_NAV = [...MAIN_NAV, ...TAKIP_NAV, ...BAGLANTI_NAV, ...YONETIM_NAV, ...HESAP_NAV];

// Telefonda alt menüdeki sık kullanılanlar; geri kalan her şey "Menü" düğmesiyle açılan pencerede
/** Belletmenin telefondaki alt menüsü: yalnızca giriş yaptığı sayfalar */
export const BELLETMEN_MOBILE_NAV: NavItem[] = [
  { href: '/anasayfa', label: 'Ana Sayfa', icon: IconHome },
  { href: '/gunluk-giris', label: 'Günlük', icon: IconChecklist },
  { href: '/konu-ilerleyisi', label: 'Konu', icon: IconBooks },
  { href: '/denemeler', label: 'Deneme', icon: IconChartBar },
];

export const MOBILE_NAV: NavItem[] = [
  { href: '/anasayfa', label: 'Ana Sayfa', icon: IconHome },
  { href: '/ogrenciler', label: 'Öğrenciler', icon: IconUsers },
  { href: '/haftalik-takip', label: 'Haftalık', icon: IconChecklist },
  { href: '/ajanda', label: 'Ajanda', icon: IconCalendarWeek },
];