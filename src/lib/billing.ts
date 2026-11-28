// Abonelik (supabase/abonelik.sql). Fiyat hesabı burada ekranda önizleme içindir; asıl tutar veritabanında
// (billing_price) aynı kuralla hesaplanır.

export type Tier = { max: number | null; price: number };
export type OrgDiscount = { min: number; pct: number };
export type BillingSettings = {
  tiers: Tier[]; yearly_discount: number; org_discounts: OrgDiscount[];
  trial_days: number; grace_days: number; bank_name: string | null; account_name: string | null; iban: string | null;
};
export type BillingState = 'free' | 'trial' | 'paid' | 'grace' | 'locked';
export type MyBilling = {
  state: BillingState; plan: 'free' | 'trial' | 'paid'; exempt: boolean;
  ends_at: string | null; lock_at: string | null; tier_max: number | null; period: 'aylik' | 'yillik' | null;
  students: number; ref_code: string | null;
  org: { id: string; name: string; is_owner: boolean; coach_limit: number | null; coaches: number } | null;
  pending: { id: string; kind: string; period: string; amount: number; tier_max: number | null; coach_count: number | null; student_count: number | null; org_name: string | null; created_at: string } | null;
};

export const sortTiers = (t: Tier[]) => [...t].sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity));

export const tierLabel = (max: number | null, prevMax?: number | null) =>
  max == null ? `${prevMax != null ? `${prevMax + 1}+` : 'Sınırsız'} öğrenci (sınırsız)` : `${prevMax != null ? prevMax + 1 : 1}–${max} öğrenci`;

/** Bireysel ya da kurumsal fiyat (TL, tam sayı) */
export function billingPrice(s: BillingSettings, kind: 'bireysel' | 'kurumsal', opts: { tierMax?: number | null; coaches?: number; students?: number; period: 'aylik' | 'yillik' }) {
  const tiers = sortTiers(s.tiers);
  const k = Math.max(1, opts.coaches ?? 1);
  const need = kind === 'kurumsal' ? Math.ceil(Math.max(1, opts.students ?? 0) / k) : (opts.tierMax ?? Infinity);
  const tier = tiers.find((t) => t.max == null || t.max >= need) ?? tiers[tiers.length - 1];
  const pct = kind === 'kurumsal'
    ? Math.max(0, ...s.org_discounts.filter((d) => d.min <= k).map((d) => d.pct))
    : 0;
  const monthly = kind === 'kurumsal' ? (tier.price * k * (100 - pct)) / 100 : tier.price;
  const amount = Math.round(opts.period === 'yillik' ? (monthly * 12 * (100 - s.yearly_discount)) / 100 : monthly);
  const studentLimit = tier.max == null ? null : kind === 'kurumsal' ? tier.max * k : tier.max;
  return { amount, monthly: Math.round(monthly), tier, discountPct: pct, studentLimit, listMonthly: tier.price * k };
}

export const fmtTL = (n: number) => `${new Intl.NumberFormat('tr-TR').format(n)} TL`;
export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

export const STATE_LABEL: Record<BillingState, string> = {
  free: 'Ücretsiz', trial: 'Deneme', paid: 'Aktif', grace: 'Salt okunur', locked: 'Kapalı',
};
