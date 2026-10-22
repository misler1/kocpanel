import DashboardLayout from '@/app/anasayfa/layout';
import { PlanTalepleri } from '@/components/PlanTalepleri';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <PlanTalepleri />
      {children}
    </DashboardLayout>
  );
}
