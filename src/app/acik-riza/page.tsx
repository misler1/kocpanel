import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Açık Rıza Metni | KoçDefterim',
  description: 'KoçDefterim yurt dışına aktarım ve yapay zekâ destekli analizler için açık rıza metni.',
  alternates: { canonical: '/acik-riza' },
};

export default function AcikRizaPage() {
  return (
    <LegalPage title="Açık Rıza Metni" href="/acik-riza">
      <p>
        <Link href="/kvkk" className="underline">KVKK Aydınlatma Metni</Link>&apos;ni okudum. Bu kapsamda, {COMPANY.title} (&quot;{COMPANY.brand}&quot;)
        tarafından aşağıdaki işlemlerin yapılmasına özgür irademle açık rıza veriyorum:
      </p>
      <ul>
        <li>
          <b>Yurt dışına aktarım:</b> Kişisel verilerimin (18 yaşından küçük öğrenciler için çocuğumun verilerinin) uygulamanın çalışması için
          kullanılan, sunucuları yurt dışında bulunabilen barındırma, veritabanı, e-posta ve bildirim hizmeti sağlayıcılarına (Supabase, Vercel,
          Resend) aktarılmasına ve orada saklanmasına.
        </li>
        <li>
          <b>Yapay zekâ destekli analiz:</b> Deneme sonuçları, çalışma kayıtları, görüşme notları ve defter fotoğraflarının; deneme analizi,
          program önerisi ve yazı okuma amacıyla yapay zekâ hizmetlerine (Google Gemini, Groq) gönderilmesine. Bu hizmetlere öğrencinin adı
          gönderilmez.
        </li>
      </ul>
      <p>
        Açık rızamı dilediğim zaman {COMPANY.email} adresine yazarak geri alabileceğimi biliyorum. Geri alma, geri almadan önceki işlemleri
        etkilemez. Yurt dışına aktarım hizmetin çalışması için gerekli olduğundan, bu rızanın geri alınması halinde hesabın kullanılması mümkün
        olmayabilir; yapay zekâ özelliklerine ilişkin rıza geri alınırsa bu özellikler hesap için kapatılır.
      </p>
      <p className="text-[13px] text-[#6B6558]">
        18 yaşından küçük öğrenciler adına bu rıza veli tarafından verilir. Koç ya da kurumun kaydettiği öğrenciler için rızanın alınması ilgili
        koçun/kurumun sorumluluğundadır.
      </p>
    </LegalPage>
  );
}
