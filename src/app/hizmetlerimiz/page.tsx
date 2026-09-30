import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  IconMessageCircle, IconChartBar, IconTarget, IconBook2, IconUsers, IconUserCheck,
} from '@tabler/icons-react';

const SERVICES = [
  { icon: IconMessageCircle, title: 'Günlük Çalışma Takibi', desc: 'Öğrenci WhatsApp\'tan günlük çalışmasını yazar, biz otomatik kaydeder ve analiz ederiz.' },
  { icon: IconChartBar, title: 'Deneme Sonuç Analizi', desc: 'TYT, AYT ve LGS deneme sonuçları ders ders, konu konu takip edilir.' },
  { icon: IconTarget, title: 'Haftalık Hedef Planlama', desc: 'Her hafta net hedefler belirlenir, ilerleme görsel olarak takip edilir.' },
  { icon: IconBook2, title: 'Konu İlerleme Takibi', desc: 'Hangi konu hangi kaynaktan çalışıldı, nerede eksik var — hepsi tek ekranda.' },
  { icon: IconUsers, title: 'Veli Görüşmeleri', desc: 'Düzenli veli bilgilendirmesiyle süreç şeffaf yürür.' },
  { icon: IconUserCheck, title: 'Birebir Koç Desteği', desc: 'Her öğrencinin kendine ait bir koçu, düzenli görüşmeler ve yönlendirme.' },
];

export default function HizmetlerimizPage() {
  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]`}>
      <MarketingHeader />
      <main className="mx-auto max-w-5xl px-5 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#1D2B3A]">Hizmetlerimiz</h1>
        <p className="mt-4 max-w-xl text-[15px] text-[#6B6558]">
          Çalışmadan sınav sonucuna kadar sürecin her adımı tek bir sistemde.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
              <s.icon size={22} className="text-[#C1442A]" />
              <div className="mt-3 font-[family-name:var(--font-display)] text-[16px] text-[#1D2B3A]">{s.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B6558]">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}