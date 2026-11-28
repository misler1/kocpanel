'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCopy, IconCheck, IconDownload, IconUsers, IconBuilding } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import {
  billingPrice, sortTiers, tierLabel, fmtTL, fmtDate, daysLeft, STATE_LABEL,
  type BillingSettings, type MyBilling,
} from '@/lib/billing';

// Koç: abonelik durumu, paket seçimi, havale/EFT bilgisi ve "Ödeme yaptım" bildirimi.
// Ödeme bankaya yapılır; sistem ödemeyi kendisi göremez. Koç açıklamaya ödeme kodunu yazar,
// yönetici hesabında ödemeyi görüp onaylayınca abonelik uzar (supabase/abonelik.sql).

const card = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5';

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }, () => {}); }}
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[11.5px] text-gray-600 hover:bg-gray-50">
      {ok ? <IconCheck size={13} /> : <IconCopy size={13} />} {ok ? 'Kopyalandı' : 'Kopyala'}
    </button>
  );
}

export function AbonelikClient({ billing, settings, payments }: { billing: MyBilling; settings: BillingSettings; payments: any[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const tiers = sortTiers(settings.tiers);
  const inOrg = !!billing.org;
  const [kind, setKind] = useState<'bireysel' | 'kurumsal'>(inOrg ? 'kurumsal' : 'bireysel');
  const [period, setPeriod] = useState<'aylik' | 'yillik'>(billing.period ?? 'aylik');
  // Varsayılan paket: öğrenci sayısını karşılayan en küçük
  const [tierMax, setTierMax] = useState<number | null>(() => (tiers.find((t) => t.max == null || t.max >= billing.students) ?? tiers[tiers.length - 1]).max);
  const [coaches, setCoaches] = useState(Math.max(2, billing.org?.coaches ?? 2));
  const [students, setStudents] = useState(Math.max(1, billing.students));
  const [orgName, setOrgName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const price = billingPrice(settings, kind, { tierMax, coaches, students, period });
  const left = daysLeft(billing.ends_at);
  const canBuy = !billing.exempt && !(inOrg && !billing.org?.is_owner);
  const freeForever = billing.state === 'free' && !billing.ends_at;

  async function report() {
    setBusy(true); setMsg(null);
    const { error } = await (supabase as any).rpc('billing_report_payment', {
      p_kind: kind, p_tier_max: kind === 'bireysel' ? tierMax : null, p_period: period,
      p_coach_count: kind === 'kurumsal' ? coaches : null, p_student_count: kind === 'kurumsal' ? students : null,
      p_org_name: kind === 'kurumsal' ? orgName : null, p_note: note,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: 'Bildiriminiz yöneticiye gönderildi. Ödeme hesaba geçince onaylanır; size bildirim gelir.' });
    router.refresh();
  }

  async function cancelPending() {
    if (!billing.pending || !confirm('Ödeme bildirimi geri çekilsin mi?')) return;
    await (supabase as any).rpc('billing_cancel_payment', { p_id: billing.pending.id });
    router.refresh();
  }

  const stateTone: Record<string, string> = {
    free: 'bg-emerald-100 text-emerald-800', paid: 'bg-emerald-100 text-emerald-800', trial: 'bg-sky-100 text-sky-800',
    grace: 'bg-red-100 text-red-800', locked: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {/* Durum */}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${stateTone[billing.state]}`}>{STATE_LABEL[billing.state]}</span>
          {billing.org && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] text-gray-700"><IconBuilding size={13} /> {billing.org.name}</span>}
        </div>
        <div className="mt-3 space-y-1 text-[13.5px] text-gray-700">
          {billing.exempt || freeForever ? (
            <p>Hesabınız ücretsiz; süre sınırı yok. Ödeme yapmanız gerekmiyor.</p>
          ) : billing.state === 'trial' ? (
            <p>Deneme süreniz <b>{fmtDate(billing.ends_at)}</b> tarihinde bitiyor ({left} gün kaldı). Deneme süresince bütün özellikler açık.</p>
          ) : billing.state === 'paid' || billing.state === 'free' ? (
            <p>Aboneliğiniz <b>{fmtDate(billing.ends_at)}</b> tarihine kadar geçerli ({left} gün kaldı){billing.period ? ` · ${billing.period === 'yillik' ? 'yıllık' : 'aylık'}` : ''}.</p>
          ) : billing.state === 'grace' ? (
            <p className="text-red-800">Süreniz {fmtDate(billing.ends_at)} tarihinde doldu; hesabınız salt okunur. <b>{fmtDate(billing.lock_at)}</b> tarihine kadar verilerinizi görebilir ve indirebilirsiniz, sonra hesap kapanır. Ödeme onaylanınca hemen açılır.</p>
          ) : (
            <p className="text-red-800">Hesabınız kapandı. Verileriniz silinmedi; ödeme onaylanınca olduğu gibi açılır.</p>
          )}
          <p className="text-[12.5px] text-gray-500">
            Aktif öğrenci: <b>{billing.students}</b>{billing.tier_max != null ? ` / ${billing.tier_max} (paket sınırı)` : ''}
            {billing.org ? ` · Kurumdaki koç: ${billing.org.coaches}${billing.org.coach_limit ? ` / ${billing.org.coach_limit}` : ''}` : ''}
          </p>
          {inOrg && !billing.org?.is_owner && <p className="text-[12.5px] text-gray-500">Aboneliğiniz kurumunuz tarafından ödeniyor.</p>}
        </div>
      </section>

      {/* Onay bekleyen bildirim */}
      {billing.pending && (
        <section className={`${card} border-amber-200 bg-amber-50`}>
          <p className="text-[13.5px] text-amber-900">
            <b>{fmtTL(Number(billing.pending.amount))}</b> tutarındaki ödeme bildiriminiz ({new Date(billing.pending.created_at).toLocaleDateString('tr-TR')}) yönetici onayı bekliyor.
            Ödeme hesaba geçince onaylanır.
          </p>
          <button type="button" onClick={cancelPending} className="mt-2 text-[12.5px] text-amber-800 underline">Bildirimi geri çek</button>
        </section>
      )}

      {/* Paket seçimi */}
      {canBuy && !billing.pending && (
        <section className={card}>
          <h2 className="text-[15px] font-semibold text-gray-900">{billing.state === 'paid' ? 'Süreyi uzat ya da paketi değiştir' : 'Paket seçin'}</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {!inOrg && (
              <div className="flex rounded-lg bg-gray-100 p-0.5 text-[13px]">
                {(['bireysel', 'kurumsal'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-medium ${kind === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    {k === 'bireysel' ? <><IconUsers size={14} /> Bireysel koç</> : <><IconBuilding size={14} /> Kurumsal</>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-lg bg-gray-100 p-0.5 text-[13px]">
              {(['aylik', 'yillik'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 font-medium ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {p === 'aylik' ? 'Aylık' : <>Yıllık <span className="text-emerald-600">%{settings.yearly_discount} indirim</span></>}
                </button>
              ))}
            </div>
          </div>

          {kind === 'bireysel' ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {tiers.map((t, i) => {
                const p = billingPrice(settings, 'bireysel', { tierMax: t.max, period });
                const sel = tierMax === t.max;
                const tooSmall = t.max != null && t.max < billing.students;
                return (
                  <button key={i} type="button" disabled={tooSmall} onClick={() => setTierMax(t.max)}
                    className={`rounded-xl border-2 p-3 text-left transition ${sel ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-gray-200 hover:border-gray-300'} disabled:cursor-not-allowed disabled:opacity-45`}>
                    <p className="text-[13px] font-semibold text-gray-900">{tierLabel(t.max, tiers[i - 1]?.max ?? null)}</p>
                    <p className="mt-0.5 text-[18px] font-bold text-gray-900">{fmtTL(p.amount)}<span className="text-[12px] font-normal text-gray-500"> / {period === 'yillik' ? 'yıl' : 'ay'}</span></p>
                    {period === 'yillik' && <p className="text-[11.5px] text-gray-500">ayda {fmtTL(Math.round(p.amount / 12))} · <s>{fmtTL(t.price * 12)}</s></p>}
                    {tooSmall && <p className="text-[11.5px] text-red-600">{billing.students} aktif öğrenciniz var</p>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-[12.5px] text-gray-600">
                Kurumunuzdaki koç sayısını ve toplam öğrenci sayısını girin; fiyat otomatik hesaplanır.
                Koç başına ortalama öğrenci sayısına göre paket seçilir, koç sayısına göre indirim uygulanır
                ({[...settings.org_discounts].sort((a, b) => a.min - b.min).map((d) => `${d.min}+ koç %${d.pct}`).join(', ')}).
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {!inOrg && (
                  <label className="text-[12.5px] text-gray-600 sm:col-span-3">Kurum adı
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={150}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13.5px] text-gray-900" placeholder="ör. ABC Eğitim Kurumları" />
                  </label>
                )}
                <label className="text-[12.5px] text-gray-600">Koç sayısı
                  <input type="number" min={2} value={coaches} onChange={(e) => setCoaches(Math.max(2, Number(e.target.value) || 2))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13.5px] text-gray-900" />
                </label>
                <label className="text-[12.5px] text-gray-600">Toplam öğrenci
                  <input type="number" min={1} value={students} onChange={(e) => setStudents(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13.5px] text-gray-900" />
                </label>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-[13px] text-gray-700">
                <p>Koç başına ortalama {Math.ceil(students / coaches)} öğrenci → <b>{tierLabel(price.tier.max)}</b> paketi ({fmtTL(price.tier.price)}/ay) × {coaches} koç = {fmtTL(price.listMonthly)}/ay</p>
                {price.discountPct > 0 && <p>Kurumsal indirim %{price.discountPct} → <b>{fmtTL(price.monthly)}/ay</b></p>}
                <p className="mt-1 text-[16px] font-bold text-gray-900">{fmtTL(price.amount)} / {period === 'yillik' ? 'yıl' : 'ay'}</p>
                <p className="text-[11.5px] text-gray-500">Öğrenci sınırı: {price.studentLimit ?? 'sınırsız'} · Koç sınırı: {coaches}</p>
              </div>
            </div>
          )}

          {/* Havale bilgisi */}
          <div className="mt-4 rounded-xl border border-gray-200 p-3 text-[13px] text-gray-700">
            <p className="font-semibold text-gray-900">Ödeme: havale / EFT</p>
            {settings.iban ? (
              <div className="mt-1.5 space-y-1">
                {settings.bank_name && <p>Banka: {settings.bank_name}</p>}
                {settings.account_name && <p>Alıcı: {settings.account_name}</p>}
                <p className="break-all">IBAN: <b className="font-mono">{settings.iban.replace(/(.{4})/g, '$1 ').trim()}</b><CopyBtn text={settings.iban} /></p>
                <p>Tutar: <b>{fmtTL(price.amount)}</b></p>
                {billing.ref_code && (
                  <p>Açıklama: <b className="font-mono">{billing.ref_code}</b><CopyBtn text={billing.ref_code} />
                    <span className="block text-[11.5px] text-gray-500">Açıklamaya bu kodu yazın: ödemenin size ait olduğu bu kodla anlaşılır.</span></p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-gray-500">Banka bilgileri henüz girilmedi; ödeme için yöneticiyle iletişime geçin.</p>
            )}
            <p className="mt-2 text-[11.5px] text-gray-500">
              Sistem banka hesabını göremez: ödemeyi yaptıktan sonra aşağıdaki düğmeye basın. Yönetici ödemeyi hesapta görünce onaylar,
              aboneliğiniz {period === 'yillik' ? '1 yıl' : '1 ay'} uzar (süreniz bitmediyse bitiş tarihine eklenir) ve size bildirim gelir.
            </p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
              placeholder="Not (isteğe bağlı): ör. ödemeyi eşimin hesabından yaptım"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px]" />
            <button type="button" onClick={report} disabled={busy || !settings.iban}
              className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
              {busy ? 'Gönderiliyor…' : `${fmtTL(price.amount)} ödedim, onaya gönder`}
            </button>
          </div>
        </section>
      )}
      {msg && <p className={`rounded-lg px-3 py-2 text-[13px] ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {/* Veri indirme */}
      {!billing.exempt && billing.state !== 'locked' && (
        <section className={card}>
          <h2 className="text-[15px] font-semibold text-gray-900">Verilerimi indir</h2>
          <p className="mt-1 text-[12.5px] text-gray-600">Öğrencileriniz, görüşmeler, denemeler, programlar ve günlük kayıtları tek bir Excel dosyasında.</p>
          <a href="/api/abonelik/disa-aktar" className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-50">
            <IconDownload size={16} /> Excel olarak indir
          </a>
        </section>
      )}

      {/* Geçmiş */}
      {payments.length > 0 && (
        <section className={card}>
          <h2 className="text-[15px] font-semibold text-gray-900">Ödeme bildirimlerim</h2>
          <ul className="mt-2 divide-y divide-gray-100 text-[13px]">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-gray-700">
                  {new Date(p.created_at).toLocaleDateString('tr-TR')} · {p.kind === 'kurumsal' ? `Kurumsal${p.org_name ? ` (${p.org_name})` : ''}` : 'Bireysel'} · {p.period === 'yillik' ? 'yıllık' : 'aylık'} · <b>{fmtTL(Number(p.amount))}</b>
                  {p.admin_note && <span className="block text-[12px] text-gray-500">Not: {p.admin_note}</span>}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${p.status === 'onaylandi' ? 'bg-emerald-100 text-emerald-800' : p.status === 'reddedildi' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  {p.status === 'onaylandi' ? 'Onaylandı' : p.status === 'reddedildi' ? 'Onaylanmadı' : 'Bekliyor'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
