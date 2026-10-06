import type { Metadata } from 'next';
import { ArticleCategoryPage } from '@/components/marketing/ArticleCategoryPage';

export const metadata: Metadata = {
  title: 'Dil Sınav Koçluğu ve YDT Rehberi | KoçDefterim',
  description: 'YDT hazırlığında kelime, reading, soru çözümü, net artışı ve dil puanıyla tercih edilebilecek bölümler üzerine rehber yazılar.',
  alternates: { canonical: '/dil-sinav-koclugu' },
};

export default function DilSinavKocluguPage() {
  return <ArticleCategoryPage categorySlug="dil-sinav-koclugu" />;
}
