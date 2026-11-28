// Yasal metinlerin (KVKK aydınlatma, açık rıza, gizlilik/çerez, kullanım koşulları) ortak bilgileri.
// Şirket kurulunca köşeli parantezli yer tutucular doldurulmalı ve metinler bir hukukçuya kontrol ettirilmelidir.
// Metin değişince LEGAL_VERSION güncellenir: kayıt olurken kabul edilen sürüm kullanıcı hesabına yazılır.

export const LEGAL_VERSION = '2026-11-28';
export const LEGAL_UPDATED = '28 Kasım 2026';

export const COMPANY = {
  brand: 'KoçDefterim',
  title: '[Şirket ünvanı]', // ör. "… Eğitim Danışmanlık Ltd. Şti."
  address: '[Şirket adresi]',
  email: '[iletişim e-posta adresi]',
  kep: '[KEP adresi]',
  mersis: '[MERSİS numarası]',
  site: 'kocdefterim.com',
};

export const LEGAL_PAGES = [
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { href: '/acik-riza', label: 'Açık Rıza Metni' },
  { href: '/gizlilik', label: 'Gizlilik ve Çerez Politikası' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
] as const;

/** Doğum tarihinden (YYYY-AA-GG) 18 yaşından küçük mü */
export function isMinor(birthDate: string, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return false;
  const eighteen = new Date(Number(m[1]) + 18, Number(m[2]) - 1, Number(m[3]));
  return eighteen > now;
}
