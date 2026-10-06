import type { Metadata } from 'next';
import { ArticleCategoryPage } from '@/components/marketing/ArticleCategoryPage';

export const metadata: Metadata = {
  title: 'YKS Koçluğu ve Rehber Yazılar | KoçDefterim',
  description: 'YKS hazırlığında TYT-AYT dengesi, net artışı, zaman yönetimi, üniversite ve bölüm tercihleri üzerine rehber yazılar.',
  alternates: { canonical: '/yks' },
};

export default function YksPage() {
  return <ArticleCategoryPage categorySlug="yks" />;
}
