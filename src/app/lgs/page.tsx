import type { Metadata } from 'next';
import { ArticleCategoryPage } from '@/components/marketing/ArticleCategoryPage';

export const metadata: Metadata = {
  title: 'LGS Koçluğu ve Rehber Yazılar | KoçDefterim',
  description: 'LGS hazırlığında çalışma düzeni, ders stratejileri, sınav kaygısı, yüzdelik dilim ve lise tercihi üzerine rehber yazılar.',
  alternates: { canonical: '/lgs' },
};

export default function LgsPage() {
  return <ArticleCategoryPage categorySlug="lgs" />;
}
