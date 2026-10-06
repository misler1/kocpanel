import type { Metadata } from 'next';
import { ArticleDetailPage } from '@/components/marketing/ArticleDetailPage';
import { ARTICLE_CATEGORIES, getArticle } from '@/lib/marketing-content';

const CATEGORY = 'yks';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLE_CATEGORIES.find((category) => category.slug === CATEGORY)?.articles.map((article) => ({ slug: article.slug })) ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(CATEGORY, slug);

  return {
    title: article ? `${article.title} | KoçDefterim` : 'YKS | KoçDefterim',
    description: article?.description,
    alternates: { canonical: article ? `/yks/${article.slug}` : '/yks' },
  };
}

export default async function YksArticlePage({ params }: PageProps) {
  const { slug } = await params;
  return <ArticleDetailPage categorySlug={CATEGORY} articleSlug={slug} />;
}
