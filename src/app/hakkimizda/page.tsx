import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function HakkimizdaPage() {
  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]`}>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#1D2B3A]">Hakkımızda</h1>
        <p className="mt-6 text-[16px] leading-relaxed text-[#4A4438]">
          {/* TODO: Gerçek kuruluş hikayenizi buraya yazın */}
          KoçDefterim, öğrencilerin YKS ve LGS hazırlık sürecini düzenli, ölçülebilir ve şeffaf
          hale getirmek için kuruldu. Her öğrencinin çalışma alışkanlığı farklıdır — biz de bu
          farkı görmezden gelmek yerine, her birinin kendi temposuna göre bir takip sistemi kurduk.
        </p>
        <p className="mt-4 text-[16px] leading-relaxed text-[#4A4438]">
          {/* TODO: Kaç yıldır hizmet verdiğiniz, kaç öğrenciye ulaştığınız gibi somut bilgiler ekleyin */}
          Koçlarımız sadece deneme sonuçlarını değil, günlük çalışma alışkanlıklarını, konu
          eksiklerini ve motivasyon sürecini birlikte takip eder. Veliler her adımda sürecin
          neresinde olduklarını görür.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { k: 'Şeffaflık', v: 'Velilerimiz sürecin her adımını görür.' },
            { k: 'Düzen', v: 'Her çalışma, her deneme kayıt altında.' },
            { k: 'Yakınlık', v: 'Her öğrencinin kendine ait bir koçu var.' },
          ].map((item) => (
            <div key={item.k} className="rounded-xl border border-[#D9D2C2] bg-white p-5">
              <div className="font-[family-name:var(--font-display)] text-[15px] text-[#1D2B3A]">{item.k}</div>
              <p className="mt-1.5 text-[13px] text-[#6B6558]">{item.v}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}