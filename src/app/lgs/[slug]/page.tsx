import type { Metadata } from 'next';
import { ArticleDetailPage } from '@/components/marketing/ArticleDetailPage';
import { ARTICLE_CATEGORIES, getArticle } from '@/lib/marketing-content';

const CATEGORY = 'lgs';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLE_CATEGORIES.find((category) => category.slug === CATEGORY)?.articles.map((article) => ({ slug: article.slug })) ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(CATEGORY, slug);

  return {
    title: article ? `${article.title} | KoçDefterim` : 'LGS | KoçDefterim',
    description: article?.description,
    alternates: { canonical: article ? `/lgs/${article.slug}` : '/lgs' },
  };
}

export default async function LgsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  return <ArticleDetailPage categorySlug={CATEGORY} articleSlug={slug} />;
}
