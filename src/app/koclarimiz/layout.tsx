import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import styles from './coaches.module.css';

export default function CoachesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${inter.variable} ${styles.site}`}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
