import Link from 'next/link';
import { daysLeft, fmtDate, type MyBilling } from '@/lib/billing';

// Üst çubuğun altında abonelik uyarısı: deneme süresi, bitişe 7 gün kala, salt okunur dönem.
// Ücretsiz (süresiz) ve muaf hesaplarda görünmez.
export function BillingBanner({ billing }: { billing: MyBilling }) {
  if (billing.exempt) return null;
  const left = daysLeft(billing.ends_at);
  let tone = '';
  let text = '';
  if (billing.state === 'trial' && left != null) {
    tone = 'bg-sky-50 text-sky-900 border-sky-200';
    text = `Deneme sürümü: ${left} gün kaldı.`;
  } else if ((billing.state === 'paid' || billing.state === 'free') && left != null && left <= 7) {
    tone = 'bg-amber-50 text-amber-900 border-amber-200';
    text = `Aboneliğiniz ${left} gün sonra (${fmtDate(billing.ends_at)}) bitiyor.`;
  } else if (billing.state === 'grace') {
    tone = 'bg-red-50 text-red-900 border-red-200';
    text = `Süreniz doldu: hesabınız salt okunur. ${fmtDate(billing.lock_at)} tarihine kadar verilerinizi görebilir ve indirebilirsiniz.`;
  } else if (billing.state === 'locked') {
    tone = 'bg-red-50 text-red-900 border-red-200';
    text = 'Hesabınız kapandı. Ödeme onaylanınca yeniden açılır.';
  } else return null;
  if (billing.pending) text += ' Ödeme bildiriminiz onay bekliyor.';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[12.5px] ${tone}`}>
      <span>{text}</span>
      <Link href="/abonelik" className="font-semibold underline">{billing.state === 'trial' ? 'Paketleri gör' : 'Abonelik ve ödeme'}</Link>
    </div>
  );
}
