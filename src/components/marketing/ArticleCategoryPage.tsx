import Link from 'next/link';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import type { ArticleCategorySlug } from '@/lib/marketing-content';
import { getCategory } from '@/lib/marketing-content';

export function ArticleCategoryPage({ categorySlug }: { categorySlug: ArticleCategorySlug }) {
  const category = getCategory(categorySlug);

  if (!category) return null;

  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">{category.label}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            {category.label} hazırlığında yolunu netleştiren rehber yazılar
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">{category.description}</p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-14 sm:grid-cols-2">
          {category.articles.map((article) => (
            <Link
              key={article.slug}
              href={`/${category.slug}/${article.slug}`}
              className="group rounded-2xl border border-[#D9D2C2] bg-white p-6 transition hover:border-[#C1442A]/50 hover:shadow-sm"
            >
              <h2 className="font-[family-name:var(--font-display)] text-[21px] leading-snug text-[#1D2B3A] group-hover:text-[#C1442A]">{article.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{article.description}</p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-[#C1442A]">Yazıyı oku</span>
            </Link>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
