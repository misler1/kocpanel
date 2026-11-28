import { DashboardShell } from '@/components/layout/DashboardShell';

// Hesabım, abonelik süresi tamamen dolsa da açılır (çıkış, şifre, hesap silme)
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell allowLocked>{children}</DashboardShell>;
}
