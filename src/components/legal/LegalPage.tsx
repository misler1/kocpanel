import Link from 'next/link';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { LEGAL_PAGES, LEGAL_UPDATED } from '@/lib/legal';

// Yasal metin sayfası iskeleti (tanıtım sitesi başlığı/alt bilgisi, diğer yasal metinlere bağlantılar)
export function LegalPage({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)] text-[#1D2B3A]`}>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 flex flex-wrap gap-2 text-[12.5px]">
          {LEGAL_PAGES.map((p) => (
            <Link key={p.href} href={p.href}
              className={`rounded-full px-3 py-1 ${p.href === href ? 'bg-[#1D2B3A] text-white' : 'bg-white text-[#6B6558] ring-1 ring-[#D9D2C2] hover:text-[#1D2B3A]'}`}>
              {p.label}
            </Link>
          ))}
        </nav>
        <h1 className="font-[family-name:var(--font-display)] text-[30px] font-semibold leading-tight">{title}</h1>
        <p className="mt-1 text-[13px] text-[#6B6558]">Son güncelleme: {LEGAL_UPDATED}</p>
        <article className="legal-text mt-6 space-y-4 text-[14.5px] leading-relaxed text-[#2E3A48] [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-[#1D2B3A] [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5 [&_table]:w-full [&_td]:border [&_td]:border-[#D9D2C2] [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-[#D9D2C2] [&_th]:bg-white [&_th]:p-2 [&_th]:text-left">
          {children}
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
