import { IconHome, IconUser, IconCalendar, IconChartBar, IconBooks } from '@tabler/icons-react';

export interface StudentNavItem {
  href: string;
  label: string;
  icon: typeof IconHome;
  // Aktifken ikon kutusunun rengi
  chip: string;
}

export const STUDENT_NAV: StudentNavItem[] = [
  { href: '/ogrenci', label: 'Ana sayfa', icon: IconHome, chip: 'bg-[#8B5CF6]' },
  { href: '/ogrenci/haftalik-takip', label: 'Haftalık', icon: IconCalendar, chip: 'bg-[#2F9BEA]' },
  { href: '/ogrenci/konu-ilerleyisi', label: 'Konular', icon: IconBooks, chip: 'bg-[#16A36F]' },
  { href: '/ogrenci/denemeler', label: 'Denemeler', icon: IconChartBar, chip: 'bg-[#F59E0B]' },
  { href: '/ogrenci/bilgilerim', label: 'Bilgilerim', icon: IconUser, chip: 'bg-[#EC4899]' },
];
