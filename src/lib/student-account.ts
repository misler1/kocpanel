// Öğrenci hesabı yardımcıları (hem sunucu hem tarayıcı tarafında kullanılabilir; gizli anahtar İÇERMEZ).

/** Telefonu sadece rakamlardan oluşan, son 10 haneli forma çevirir: 05315579683 -> 5315579683 */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** Telefondan, Supabase Auth için sahte (gerçek posta gönderilmeyen) e-posta üretir. */
export function studentEmailFromPhone(raw: string | null | undefined): string | null {
  const key = phoneKey(raw);
  return key ? `ogr${key}@ogrenci.kocdefterim.com` : null;
}

/** Başlangıç şifresi: telefonun son 4 hanesi + doğum yılı (örn. 05315579683 + 2009 => 96832009). */
export function initialStudentPassword(
  phone: string | null | undefined,
  birthDate: string | null | undefined
): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const year = (birthDate ?? '').slice(0, 4);
  if (digits.length < 4 || !/^\d{4}$/.test(year)) return null;
  return `${digits.slice(-4)}${year}`;
}
