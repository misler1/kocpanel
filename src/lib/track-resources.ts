// src/lib/track-resources.ts
// Sınav türüne (ExamTrack) göre ders listesi.
// Hem "Kullanılan Kaynaklar" (öğrenci ekleme/düzenleme) hem de
// Kazanım Havuzu'ndan otomatik konu atama bu listeyi kullanır.
// Buraya yeni bir ders eklerseniz (örn. Sözel'e "AYT Felsefe"),
// hem kaynak girişinde hem otomatik atamada otomatik devreye girer.

export const TRACK_RESOURCES: Record<string, string[]> = {
  YKS_SAY: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji',
  ],
  YKS_EA: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya',
  ],
  YKS_SOZ: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya',
    'AYT Sosyal-2 Tarih', 'AYT Sosyal-2 Coğrafya',
    'AYT Felsefe', 'AYT Din Kültürü',
  ],
  YKS_DIL: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü', 'YDT İngilizce',
  ],
  LGS: [
    'Türkçe', 'Paragraf', 'Matematik', 'Fen Bilgisi',
    'İnkılap Tarihi', 'Din Kültürü', 'İngilizce',
  ],
  DIGER: [],
};