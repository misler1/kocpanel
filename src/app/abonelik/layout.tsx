import { DashboardShell } from '@/components/layout/DashboardShell';

// Abonelik sayfası, süre tamamen dolsa da açılır (ödeme yapılabilsin)
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell allowLocked>{children}</DashboardShell>;
}
