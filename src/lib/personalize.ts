// Toplu mesajda kişiye özel hitap: {ad} / [ad] → öğrencinin adı, {adsoyad} → adı soyadı

// "AHMET YILMAZ" / "ahmet yılmaz" → "Ahmet Yılmaz"
function niceCase(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t !== t.toLocaleUpperCase('tr') && t !== t.toLocaleLowerCase('tr')) return t; // zaten düzgün yazılmış
  return t.toLocaleLowerCase('tr').split(' ').map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' ');
}

// Ad: soyad (son kelime) hariç kısım. "Safa Emin Gündoğdu" → "Safa Emin"
export function firstName(full: string) {
  const w = niceCase(full).split(' ');
  return w.length > 1 ? w.slice(0, -1).join(' ') : w[0] ?? '';
}

// {ad}, [ad], {adsoyad}, [ad soyad] … büyük/küçük harf fark etmez
export function personalize(template: string, fullName: string) {
  return template
    .replace(/[{[]\s*ad\s*_?\s*soyad\s*[}\]]/giu, niceCase(fullName))
    .replace(/[{[]\s*(ad|isim)\s*[}\]]/giu, firstName(fullName));
}

export const hasNameToken = (t: string) => /[{[]\s*(ad|isim|ad\s*_?\s*soyad)\s*[}\]]/iu.test(t);
