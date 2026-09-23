// "444,9876" veya "444.9876" → 444.9876 (JS number)
export function parseTurkishNumber(input: string): number | null {
  if (!input || !input.trim()) return null;
  const normalized = input.trim().replace(',', '.');
  const num = Number(normalized);
  return isNaN(num) ? null : num;
}

// 444.9876 (number) veya "444.9876" (Supabase'den gelen string) → "444,9876"
export function formatTurkishNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}