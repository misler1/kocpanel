import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#D9D2C2] bg-[#FBF9F4] px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#1D2B3A]">KoçDefterim</div>
          <p className="mt-2 max-w-xs text-[13px] text-[#6B6558]">
            YKS ve LGS hazırlık sürecinde her öğrenciye özel takip ve rehberlik.
          </p>
        </div>
        <div className="flex gap-12 text-[13px]">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-[#1D2B3A]">Kurumsal</span>
            <Link href="/hakkimizda" className="text-[#6B6558] hover:text-[#1D2B3A]">Hakkımızda</Link>
            <Link href="/koclarimiz" className="text-[#6B6558] hover:text-[#1D2B3A]">Koçlarımız</Link>
            <Link href="/hizmetlerimiz" className="text-[#6B6558] hover:text-[#1D2B3A]">Hizmetlerimiz</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-[#1D2B3A]">Giriş</span>
            <Link href="/giris" className="text-[#6B6558] hover:text-[#1D2B3A]">Koç Girişi</Link>
            <Link href="/giris/ogrenci" className="text-[#6B6558] hover:text-[#1D2B3A]">Öğrenci Girişi</Link>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-[12px] text-[#9A927E]">
        © {new Date().getFullYear()} KoçDefterim. Tüm hakları saklıdır.
      </p>
    </footer>
  );
}