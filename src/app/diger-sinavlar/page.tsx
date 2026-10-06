import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Diğer Sınavlar | KoçDefterim',
  description: 'KoçDefterim’de farklı sınavlara hazırlık için çalışma planı, takip, deneme analizi ve rehberlik yaklaşımı.',
  alternates: { canonical: '/diger-sinavlar' },
};

export default function DigerSinavlarPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-20">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Diğer Sınavlar</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
          Farklı sınavlarda da düzenli takip, doğru plan ve sakin bir çalışma ritmi gerekir.
        </h1>
        <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
          Her sınavın içeriği, soru tarzı ve hazırlık süresi farklıdır. Yine de iyi bir hazırlığın temelinde benzer şeyler bulunur: öğrencinin seviyesini görmek, haftalık planı gerçekçi kurmak, deneme sonuçlarını doğru okumak ve süreci düzenli takip etmek.
        </p>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
          Bu bölümde farklı sınav türleri için rehber içerikler zamanla genişletilecek. Şimdilik KoçDefterim’in genel yaklaşımı; öğrencinin hedefini netleştirmek, çalışmayı ölçülebilir hale getirmek ve sınav sürecini dağınık notlardan kurtarmaktır.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
