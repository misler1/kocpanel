import { IconHome, IconUser, IconCalendar, IconChartBar, IconBooks } from '@tabler/icons-react';

export interface StudentNavItem {
  href: string;
  label: string;
  icon: typeof IconHome;
}

export const STUDENT_NAV: StudentNavItem[] = [
  { href: '/ogrenci', label: 'Ana sayfa', icon: IconHome },
  { href: '/ogrenci/bilgilerim', label: 'Bilgilerim', icon: IconUser },
  { href: '/ogrenci/haftalik-takip', label: 'Haftalık', icon: IconCalendar },
  { href: '/ogrenci/denemeler', label: 'Denemeler', icon: IconChartBar },
  { href: '/ogrenci/konu-ilerleyisi', label: 'Konular', icon: IconBooks },
];
