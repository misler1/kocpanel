import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { getArticle, getCategory } from '@/lib/marketing-content';

export function ArticleDetailPage({ categorySlug, articleSlug }: { categorySlug: string; articleSlug: string }) {
  const article = getArticle(categorySlug, articleSlug);
  const category = getCategory(categorySlug);

  if (!article || !category) notFound();

  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <article className="mx-auto max-w-3xl px-5 pb-16 pt-20">
          <Link href={`/${category.slug}`} className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">
            {category.label}
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#6B6558]">{article.description}</p>

          <div className="mt-9 space-y-5 text-[16px] leading-relaxed text-[#4A4438]">
            {article.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 space-y-7">
            {article.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1D2B3A]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#6B6558]">
                  {(Array.isArray(section.body) ? section.body : [section.body]).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {article.references && article.references.length > 0 && (
            <section className="mt-10 rounded-2xl border border-[#D9D2C2] bg-white p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1D2B3A]">Kaynakça</h2>
              <ol className="mt-4 space-y-4">
                {article.references.map((reference) => (
                  <li key={reference.title} className="text-[14px] leading-relaxed text-[#6B6558]">
                    <p className="font-semibold text-[#1D2B3A]">{reference.title}</p>
                    <p className="mt-1">{reference.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-10 rounded-2xl bg-[#1D2B3A] p-6 text-white">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Küçük bir not</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/75">
              Sınav sürecinde en doğru plan, öğrencinin mevcut durumu ve hedefi birlikte değerlendirilerek hazırlanır. Bu yazı genel rehberlik sağlar; net kararlar için güncel kılavuzlar, okul bilgileri ve öğrencinin kişisel verileri birlikte incelenmelidir.
            </p>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}


