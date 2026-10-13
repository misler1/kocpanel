import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { IconArrowUpRight } from '@tabler/icons-react';
import styles from './coaches.module.css';

export const metadata: Metadata = {
  title: 'Koçlarımız | KoçDefterim',
  description: 'KoçDefterim eğitim koçlarını tanıyın. LGS, YKS ve akademik takip alanlarında çalışan koçlarımızın eğitimlerini ve deneyimlerini inceleyin.',
  alternates: { canonical: '/koclarimiz' },
};

export default function KoclarimizPage() {
  return (
    <main className={styles.directory}>
      <p className={styles.eyebrow}>KoçDefterim</p>
      <h1 className={styles.directoryTitle}>Koçlarımız</h1>
      <p className={styles.intro}>Sınava hazırlık sürecinde size eşlik edecek eğitim koçlarımızı tanıyın.</p>
      <div className={styles.coachGrid}>
        <Link href="/koclarimiz/musa-isler" className={styles.coachCard}>
          <Image src="/images/musa-isler.png" alt="Musa İşler" width={300} height={300} unoptimized className={styles.cardPortrait} />
          <div className={styles.cardCopy}>
            <h2>Musa İşler</h2>
            <p className={styles.cardRole}>Psikolojik Danışman · Eğitim Koçu</p>
            <p>LGS, YKS ve akademik takip süreçlerinde öğrenciye özel planlama ve rehberlik.</p>
            <span className={styles.profileLink}>Profili incele <IconArrowUpRight size={18} aria-hidden="true" /></span>
          </div>
        </Link>
      </div>
    </main>
  );
}
