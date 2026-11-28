import { DashboardShell } from '@/components/layout/DashboardShell';

// Koç panelinin bütün bölümleri (ajanda, denemeler, öğrenciler…) bu iskeleti kullanır.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
