import Link from 'next/link';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function OgrenciGirisPage() {
  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]`}>
      <MarketingHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Öğrenci Girişi</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#6B6558]">
          Şu an öğrenciler sisteme ayrıca giriş yapmıyor — günlük çalışmalarınızı doğrudan
          koçunuzun WhatsApp hattına yazarak paylaşabilirsiniz. Deneme sonuçlarınızı ve
          ilerlemenizi koçunuz sizinle düzenli olarak paylaşacaktır.
        </p>
        <Link href="/" className="mt-8 text-[14px] font-medium text-[#C1442A] hover:underline">
          Anasayfaya dön
        </Link>
      </main>
      <MarketingFooter />
    </div>
  );
}