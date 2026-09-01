import {
  IconHome,
  IconUsers,
  IconNotes,
  IconChecklist,
  IconBooks,
  IconChartBar,
  IconUsersGroup,
  IconCalendar,
  IconSettings,
  IconUserCircle,
  IconMessageCircle,
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
];

export const TAKIP_NAV: NavItem[] = [
  { href: '/gorusmeler', label: 'Görüşme kayıtları', icon: IconNotes, section: 'Takip' },
  { href: '/haftalik-takip', label: 'Haftalık Takip', icon: IconChecklist },
  { href: '/konu-ilerleyisi', label: 'Konu ilerleyişi', icon: IconBooks },
  { href: '/denemeler', label: 'Deneme sonuçları', icon: IconChartBar },
];

export const BAGLANTI_NAV: NavItem[] = [
  { href: '/veli-gorusmeleri', label: 'Veli görüşmeleri', icon: IconUsersGroup, section: 'Bağlantı' },
  { href: '/ders-programi', label: 'Ders programı', icon: IconCalendar },
  { href: '/mesajlar', label: 'Mesajlar', icon: IconMessageCircle },
];

export const HESAP_NAV: NavItem[] = [
  { href: '/ayarlar', label: 'Ayarlar', icon: IconSettings, section: 'Hesap' },
  { href: '/hesabim', label: 'Hesabım', icon: IconUserCircle },
];

export const ALL_NAV = [...MAIN_NAV, ...TAKIP_NAV, ...BAGLANTI_NAV, ...HESAP_NAV];

// Mobil alt navigasyon (5 ana sekme)
export const MOBILE_NAV: NavItem[] = [
  { href: '/anasayfa', label: 'Ana Sayfa', icon: IconHome },
  { href: '/ogrenciler', label: 'Öğrenciler', icon: IconUsers },
  { href: '/denemeler', label: 'Denemeler', icon: IconChartBar },
  { href: '/ders-programi', label: 'Takvim', icon: IconCalendar },
  { href: '/ayarlar', label: 'Menü', icon: IconSettings },
];
