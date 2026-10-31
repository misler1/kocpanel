import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { ARTICLE_CATEGORIES } from '@/lib/marketing-content';

// Google'a dizine alınacak tanıtım sayfalarını bildirir. Yeni bir tanıtım sayfası eklenirse buraya da eklenmeli;
// rehber yazılar marketing-content'ten otomatik gelir.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/hizmetlerimiz', priority: 0.9 },
    { path: '/hakkimizda', priority: 0.8 },
    { path: '/koclarimiz', priority: 0.8 },
    { path: '/koclarimiz/musa-isler', priority: 0.7 },
    { path: '/yks', priority: 0.8 },
    { path: '/lgs', priority: 0.8 },
    { path: '/dil-sinav-koclugu', priority: 0.7 },
    { path: '/diger-sinavlar', priority: 0.6 },
  ];
  const articles = ARTICLE_CATEGORIES.flatMap((c) =>
    c.articles.map((a) => ({ path: `/${c.slug}/${a.slug}`, priority: 0.6 })),
  );

  return [...pages, ...articles].map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority,
  }));
}
