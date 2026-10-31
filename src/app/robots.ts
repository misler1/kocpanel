import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Tanıtım sayfaları taranır; panel, giriş ve API sayfaları arama sonuçlarına girmesin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', '/anasayfa', '/ogrenci', '/ogrenciler', '/denemeler', '/haftalik-takip', '/konu-ilerleyisi',
        '/gorusmeler', '/veli-gorusmeleri', '/mesajlar', '/Ajanda', '/ayarlar', '/hesabim', '/anket',
        '/anketler', '/kazanim-havuzu', '/onay-bekleniyor', '/giris', '/sifremi-unuttum', '/sifre-sifirla',
        // '/kayit' tek başına yazılırsa önek eşleşmesiyle herkese açık /kayit-formu da engellenir
        '/kayit$', '/kayit/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
