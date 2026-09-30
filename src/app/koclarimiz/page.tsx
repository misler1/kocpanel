import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// TODO: Gerçek koç bilgilerinizle değiştirin
const COACHES = [
  { name: '[Koç Adı Soyadı]', branch: 'YKS Sayısal', bio: 'Kısa tanıtım yazısı buraya gelecek.' },
  { name: '[Koç Adı Soyadı]', branch: 'YKS Sözel', bio: 'Kısa tanıtım yazısı buraya gelecek.' },
  { name: '[Koç Adı Soyadı]', branch: 'LGS', bio: 'Kısa tanıtım yazısı buraya gelecek.' },
];

export default function KoclarimizPage() {
  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]`}>
      <MarketingHeader />
      <main className="mx-auto max-w-5xl px-5 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#1D2B3A]">Koçlarımız</h1>
        <p className="mt-4 max-w-xl text-[15px] text-[#6B6558]">
          Her öğrenci, alanında deneyimli bir koçla birebir çalışır.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COACHES.map((c) => (
            <div key={c.name} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
              <div className="mb-3 h-14 w-14 rounded-full bg-[#EDE8DC]" />
              <div className="font-[family-name:var(--font-display)] text-[16px] text-[#1D2B3A]">{c.name}</div>
              <div className="mt-0.5 text-[12px] text-[#C1442A]">{c.branch}</div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B6558]">{c.bio}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}