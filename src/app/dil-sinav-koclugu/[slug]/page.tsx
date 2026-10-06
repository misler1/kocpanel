import type { Metadata } from 'next';
import { ArticleDetailPage } from '@/components/marketing/ArticleDetailPage';
import { ARTICLE_CATEGORIES, getArticle } from '@/lib/marketing-content';

const CATEGORY = 'dil-sinav-koclugu';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLE_CATEGORIES.find((category) => category.slug === CATEGORY)?.articles.map((article) => ({ slug: article.slug })) ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(CATEGORY, slug);

  return {
    title: article ? `${article.title} | KoçDefterim` : 'Dil Sınav Koçluğu | KoçDefterim',
    description: article?.description,
    alternates: { canonical: article ? `/dil-sinav-koclugu/${article.slug}` : '/dil-sinav-koclugu' },
  };
}

export default async function DilArticlePage({ params }: PageProps) {
  const { slug } = await params;
  return <ArticleDetailPage categorySlug={CATEGORY} articleSlug={slug} />;
}
