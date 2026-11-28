'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fmtTL, fmtDate, sortTiers, tierLabel, STATE_LABEL, type BillingSettings, type Tier, type OrgDiscount } from '@/lib/billing';

// Yönetici: ödeme onayları, koçların abonelikleri (ücretsiz/deneme/ücretli, bitiş, paket, kurum), kurumlar, ayarlar.

const card = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm';
const input = 'rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] text-gray-900';
const btn = 'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold';
const toDateInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '');
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:00`).toISOString() : null);
const stateTone: Record<string, string> = {
  free: 'bg-emerald-100 text-emerald-800', paid: 'bg-emerald-100 text-emerald-800', trial: 'bg-sky-100 text-sky-800',
  grace: 'bg-amber-100 text-amber-800', locked: 'bg-red-100 text-red-700',
};

export function AboneliklerClient({ accounts, orgs, payments, settings }: { accounts: any[]; orgs: any[]; payments: any[]; settings: BillingSettings }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as any, []);
  const [tab, setTab] = useState<'odemeler' | 'koclar' | 'kurumlar' | 'ayarlar'>(payments.some((p) => p.status === 'bekliyor') ? 'odemeler' : 'koclar');
  const [err, setErr] = useState<string | null>(null);

  async function call(fn: string, args: Record<string, unknown>) {
    setErr(null);
    const { error } = await supabase.rpc(fn, args);
    if (error) { setErr(error.message); return false; }
    router.refresh();
    return true;
  }

  const pendingCount = payments.filter((p) => p.status === 'bekliyor').length;
  const tabs = [
    { id: 'odemeler', label: `Ödeme bildirimleri${pendingCount ? ` (${pendingCount})` : ''}` },
    { id: 'koclar', label: `Koçlar (${accounts.length})` },
    { id: 'kurumlar', label: `Kurumlar (${orgs.length})` },
    { id: 'ayarlar', label: 'Fiyatlar ve banka' },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 text-[13px]">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 font-medium ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
      {tab === 'odemeler' && <Payments payments={payments} call={call} />}
      {tab === 'koclar' && <Accounts accounts={accounts} orgs={orgs} settings={settings} call={call} />}
      {tab === 'kurumlar' && <Orgs orgs={orgs} accounts={accounts} call={call} />}
      {tab === 'ayarlar' && <Settings settings={settings} call={call} />}
    </div>
  );
}

type Call = (fn: string, args: Record<string, unknown>) => Promise<boolean>;

function Payments({ payments, call }: { payments: any[]; call: Call }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!payments.length) return <p className={`${card} text-[13px] text-gray-500`}>Henüz ödeme bildirimi yok.</p>;
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-gray-500">Banka hesabınızda ödemeyi açıklamadaki koda (KD…) ve tutara bakarak bulun, sonra onaylayın. Onay aboneliği 1 ay / 1 yıl uzatır.</p>
      {payments.map((p) => (
        <div key={p.id} className={`${card} ${p.status === 'bekliyor' ? 'border-amber-200' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-[13px] text-gray-700">
              <p className="text-[14px] font-semibold text-gray-900">{p.full_name} · {fmtTL(Number(p.amount))}</p>
              <p>{p.kind === 'kurumsal' ? `Kurumsal: ${p.org_name ?? ''} · ${p.coach_count} koç, ${p.student_count} öğrenci` : `Bireysel · ${p.tier_max == null ? 'sınırsız' : `${p.tier_max} öğrenciye kadar`}`} · {p.period === 'yillik' ? 'yıllık' : 'aylık'}</p>
              <p>Ödeme kodu: <b className="font-mono">{p.ref_code}</b> · {new Date(p.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              {p.payer_note && <p className="text-gray-500">Koçun notu: {p.payer_note}</p>}
              {p.admin_note && <p className="text-gray-500">Notunuz: {p.admin_note}</p>}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${p.status === 'onaylandi' ? 'bg-emerald-100 text-emerald-800' : p.status === 'reddedildi' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              {p.status === 'onaylandi' ? 'Onaylandı' : p.status === 'reddedildi' ? 'Reddedildi' : 'Bekliyor'}
            </span>
          </div>
          {p.status === 'bekliyor' && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={notes[p.id] ?? ''} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} placeholder="Not (reddederken koça gider)" className={`${input} min-w-[220px] flex-1`} />
              <button type="button" className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={() => call('billing_admin_decide', { p_id: p.id, p_approve: true, p_note: notes[p.id] ?? null })}>Ödeme geldi, onayla</button>
              <button type="button" className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`} onClick={() => confirm('Bildirim reddedilsin mi?') && call('billing_admin_decide', { p_id: p.id, p_approve: false, p_note: notes[p.id] ?? null })}>Reddet</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Accounts({ accounts, orgs, settings, call }: { accounts: any[]; orgs: any[]; settings: BillingSettings; call: Call }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const shown = accounts.filter((a) => !q || `${a.full_name} ${a.email ?? ''}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  return (
    <div className={card}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Koç ara" className={`${input} w-56`} />
        <p className="text-[12px] text-gray-500">Yönetici, kurum personeli ve stajyerler listede yok (her zaman ücretsiz).</p>
      </div>
      <ul className="divide-y divide-gray-100">
        {shown.map((a) => (
          <li key={a.profile_id} className="py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="min-w-[160px] flex-1 font-medium text-gray-900">{a.full_name}{!a.is_approved && <span className="ml-1 text-[11px] text-gray-400">(onay bekliyor)</span>}
                <span className="block text-[11.5px] font-normal text-gray-500">{a.email}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${stateTone[a.state]}`}>
                {a.state === 'free' && !a.ends_at ? 'Ücretsiz · süresiz' : STATE_LABEL[a.state as keyof typeof STATE_LABEL]}
              </span>
              <span className="w-40 text-[12px] text-gray-600">
                {a.ends_at ? `Bitiş: ${fmtDate(a.ends_at)}` : !a.has_account ? 'İlk girişte deneme başlar' : ''}
                {a.org_name && <span className="block">Kurum: {a.org_name}</span>}
              </span>
              <span className="w-28 text-[12px] text-gray-600">{a.students} öğrenci{a.tier_max != null ? ` / ${a.tier_max}` : ''}</span>
              <button type="button" onClick={() => setEditing(editing === a.profile_id ? null : a.profile_id)} className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                {editing === a.profile_id ? 'Kapat' : 'Düzenle'}
              </button>
            </div>
            {a.note && editing !== a.profile_id && <p className="mt-0.5 text-[11.5px] text-gray-400">{a.note}</p>}
            {editing === a.profile_id && <AccountEditor a={a} orgs={orgs} settings={settings} call={call} done={() => setEditing(null)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountEditor({ a, orgs, settings, call, done }: { a: any; orgs: any[]; settings: BillingSettings; call: Call; done: () => void }) {
  const initialMode = a.plan === 'free' ? (a.ends_at ? 'free_until' : 'free') : a.plan;
  const [mode, setMode] = useState<'free' | 'free_until' | 'trial' | 'paid'>(initialMode);
  const [ends, setEnds] = useState(toDateInput(a.ends_at));
  const [tier, setTier] = useState<string>(a.tier_max == null ? '' : String(a.tier_max));
  const [period, setPeriod] = useState<string>(a.period ?? 'aylik');
  const [note, setNote] = useState<string>(a.note ?? '');
  const [org, setOrg] = useState<string>(a.org_id ?? '');
  const tiers = sortTiers(settings.tiers);

  async function save() {
    const plan = mode === 'free_until' ? 'free' : mode;
    if (mode !== 'free' && !ends) { alert('Bitiş tarihi seçin.'); return; }
    const ok = await call('billing_admin_set', {
      p_profile: a.profile_id, p_plan: plan, p_ends_at: mode === 'free' ? null : endOfDay(ends),
      p_tier_max: mode === 'paid' && tier ? Number(tier) : null, p_period: mode === 'paid' ? period : null, p_note: note,
    });
    if (ok && org !== (a.org_id ?? '')) await call('billing_admin_set_org', { p_profile: a.profile_id, p_org: org || null });
    if (ok) done();
  }
  const addDays = (n: number) => {
    const base = ends && new Date(ends) > new Date() ? new Date(ends) : new Date();
    base.setDate(base.getDate() + n);
    setEnds(base.toLocaleDateString('sv-SE'));
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3 text-[12.5px] text-gray-700">
      <div className="flex flex-wrap gap-1.5">
        {([['free', 'Ücretsiz · süresiz'], ['free_until', 'Ücretsiz · bitiş tarihli'], ['trial', 'Deneme'], ['paid', 'Ücretli']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`${btn} ${mode === k ? 'bg-[var(--accent)] text-white' : 'border border-gray-200 bg-white text-gray-700'}`}>{l}</button>
        ))}
      </div>
      {mode !== 'free' && (
        <div className="flex flex-wrap items-center gap-2">
          <label>Bitiş: <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className={input} /></label>
          <button type="button" onClick={() => addDays(30)} className={`${btn} border border-gray-200 bg-white`}>+1 ay</button>
          <button type="button" onClick={() => addDays(365)} className={`${btn} border border-gray-200 bg-white`}>+1 yıl</button>
          <button type="button" onClick={() => setEnds(new Date().toLocaleDateString('sv-SE'))} className={`${btn} border border-gray-200 bg-white`}>Bugün bitir</button>
          <span className="text-[11.5px] text-gray-500">Bitince {settings.grace_days} gün salt okunur, sonra kapanır.</span>
        </div>
      )}
      {mode === 'paid' && (
        <div className="flex flex-wrap items-center gap-2">
          <label>Paket: <select value={tier} onChange={(e) => setTier(e.target.value)} className={input}>
            {tiers.map((t, i) => <option key={i} value={t.max == null ? '' : String(t.max)}>{tierLabel(t.max, tiers[i - 1]?.max ?? null)}</option>)}
          </select></label>
          <label>Dönem: <select value={period} onChange={(e) => setPeriod(e.target.value)} className={input}><option value="aylik">Aylık</option><option value="yillik">Yıllık</option></select></label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label>Kurum: <select value={org} onChange={(e) => setOrg(e.target.value)} className={input}>
          <option value="">Yok (kendi aboneliği)</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></label>
        <span className="text-[11.5px] text-gray-500">Kurumdaysa kurumun aboneliği geçerlidir.</span>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (yalnızca siz görürsünüz), ör. arkadaşım, 2027'ye kadar ücretsiz" className={`${input} w-full`} />
      <button type="button" onClick={save} className={`${btn} bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]`}>Kaydet</button>
    </div>
  );
}

function Orgs({ orgs, accounts, call }: { orgs: any[]; accounts: any[]; call: Call }) {
  const blank = { id: null, name: '', owner_id: '', plan: 'paid', ends_at: null, period: 'aylik', coach_limit: '', student_limit: '', note: '' };
  const [form, setForm] = useState<any | null>(null);
  async function save() {
    if (!form.name.trim()) { alert('Kurum adı yazın.'); return; }
    if (form.plan !== 'free' && !form.ends) { alert('Bitiş tarihi seçin.'); return; }
    const ok = await call('billing_admin_upsert_org', {
      p_id: form.id, p_name: form.name, p_owner: form.owner_id || null, p_plan: form.plan,
      p_ends_at: form.plan === 'free' && !form.ends ? null : endOfDay(form.ends), p_period: form.period,
      p_coach_limit: form.coach_limit ? Number(form.coach_limit) : null, p_student_limit: form.student_limit ? Number(form.student_limit) : null,
      p_note: form.note || null,
    });
    if (ok) setForm(null);
  }
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-gray-500">Kurumsal ödeme onaylanınca kurum kendiliğinden kurulur. Diğer koçları &quot;Koçlar&quot; sekmesinde Düzenle → Kurum ile ekleyin.</p>
      {orgs.map((o) => (
        <div key={o.id} className={`${card} flex flex-wrap items-center gap-2 text-[13px]`}>
          <span className="min-w-[160px] flex-1"><b className="text-gray-900">{o.name}</b>
            <span className="block text-[12px] text-gray-500">Yönetici koç: {o.owner_name ?? '—'} · Ödeme kodu {o.ref_code}</span></span>
          <span className="text-[12px] text-gray-600">{o.plan === 'free' ? 'Ücretsiz' : o.plan === 'trial' ? 'Deneme' : 'Ücretli'}{o.ends_at ? ` · ${fmtDate(o.ends_at)}` : ' · süresiz'}</span>
          <span className="text-[12px] text-gray-600">{o.coaches}{o.coach_limit ? `/${o.coach_limit}` : ''} koç · {o.students}{o.student_limit ? `/${o.student_limit}` : ''} öğrenci</span>
          <button type="button" className={`${btn} border border-gray-200`} onClick={() => setForm({ ...o, owner_id: o.owner_id ?? '', coach_limit: o.coach_limit ?? '', student_limit: o.student_limit ?? '', note: o.note ?? '', ends: toDateInput(o.ends_at) })}>Düzenle</button>
          <button type="button" className={`${btn} text-red-600`} onClick={() => confirm(`${o.name} silinsin mi? Koçları kendi hesap durumlarına döner.`) && call('billing_admin_delete_org', { p_id: o.id })}>Sil</button>
        </div>
      ))}
      {form ? (
        <div className={`${card} space-y-2 text-[12.5px] text-gray-700`}>
          <div className="flex flex-wrap gap-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kurum adı" className={`${input} flex-1`} />
            <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className={input}>
              <option value="">Yönetici koç seçin</option>
              {accounts.map((a) => <option key={a.profile_id} value={a.profile_id}>{a.full_name}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className={input}>
              <option value="paid">Ücretli</option><option value="trial">Deneme</option><option value="free">Ücretsiz</option>
            </select>
            <label>Bitiş: <input type="date" value={form.ends ?? ''} onChange={(e) => setForm({ ...form, ends: e.target.value })} className={input} /></label>
            <select value={form.period ?? 'aylik'} onChange={(e) => setForm({ ...form, period: e.target.value })} className={input}><option value="aylik">Aylık</option><option value="yillik">Yıllık</option></select>
            <input type="number" value={form.coach_limit} onChange={(e) => setForm({ ...form, coach_limit: e.target.value })} placeholder="Koç sınırı" className={`${input} w-28`} />
            <input type="number" value={form.student_limit} onChange={(e) => setForm({ ...form, student_limit: e.target.value })} placeholder="Öğrenci sınırı" className={`${input} w-32`} />
          </div>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Not" className={`${input} w-full`} />
          <div className="flex gap-2">
            <button type="button" onClick={save} className={`${btn} bg-[var(--accent)] text-white`}>Kaydet</button>
            <button type="button" onClick={() => setForm(null)} className={`${btn} border border-gray-200`}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setForm({ ...blank, ends: '' })} className={`${btn} border border-gray-200 bg-white`}>+ Kurum ekle</button>
      )}
    </div>
  );
}

function Settings({ settings, call }: { settings: BillingSettings; call: Call }) {
  const [tiers, setTiers] = useState<{ max: string; price: string }[]>(sortTiers(settings.tiers).map((t) => ({ max: t.max == null ? '' : String(t.max), price: String(t.price) })));
  const [disc, setDisc] = useState<{ min: string; pct: string }[]>([...settings.org_discounts].sort((a, b) => a.min - b.min).map((d) => ({ min: String(d.min), pct: String(d.pct) })));
  const [f, setF] = useState({
    yearly_discount: String(settings.yearly_discount), trial_days: String(settings.trial_days), grace_days: String(settings.grace_days),
    bank_name: settings.bank_name ?? '', account_name: settings.account_name ?? '', iban: settings.iban ?? '',
  });
  const [saved, setSaved] = useState(false);

  async function save() {
    const t: Tier[] = tiers.filter((x) => x.price).map((x) => ({ max: x.max ? Number(x.max) : null, price: Number(x.price) }));
    if (!t.length) { alert('En az bir paket gerekli.'); return; }
    if (t.filter((x) => x.max == null).length > 1) { alert('Yalnızca bir paket sınırsız olabilir.'); return; }
    const d: OrgDiscount[] = disc.filter((x) => x.min && x.pct).map((x) => ({ min: Number(x.min), pct: Number(x.pct) }));
    const ok = await call('billing_admin_settings', { p: {
      tiers: sortTiers(t), org_discounts: d, yearly_discount: Number(f.yearly_discount) || 0,
      trial_days: Number(f.trial_days) || 0, grace_days: Number(f.grace_days) || 0,
      bank_name: f.bank_name, account_name: f.account_name, iban: f.iban,
    } });
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <div className={`${card} space-y-4 text-[13px] text-gray-700`}>
      <div>
        <p className="font-semibold text-gray-900">Bireysel paketler (aylık)</p>
        <p className="text-[12px] text-gray-500">Öğrenci sınırını boş bırakılan paket sınırsızdır.</p>
        {tiers.map((t, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <input type="number" value={t.max} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, max: e.target.value } : x)))} placeholder="sınırsız" className={`${input} w-28`} />
            <span>öğrenciye kadar</span>
            <input type="number" value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className={`${input} w-24`} />
            <span>TL / ay</span>
            <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-[12px] text-red-600">Sil</button>
          </div>
        ))}
        <button type="button" onClick={() => setTiers([...tiers, { max: '', price: '' }])} className="mt-1.5 text-[12.5px] text-[var(--accent)]">+ Paket ekle</button>
      </div>
      <div>
        <p className="font-semibold text-gray-900">Kurumsal indirim (koç sayısına göre)</p>
        {disc.map((d, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <input type="number" value={d.min} onChange={(e) => setDisc(disc.map((x, j) => (j === i ? { ...x, min: e.target.value } : x)))} className={`${input} w-20`} />
            <span>koç ve üstü</span>
            <input type="number" value={d.pct} onChange={(e) => setDisc(disc.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} className={`${input} w-20`} />
            <span>% indirim</span>
            <button type="button" onClick={() => setDisc(disc.filter((_, j) => j !== i))} className="text-[12px] text-red-600">Sil</button>
          </div>
        ))}
        <button type="button" onClick={() => setDisc([...disc, { min: '', pct: '' }])} className="mt-1.5 text-[12.5px] text-[var(--accent)]">+ Kademe ekle</button>
      </div>
      <div className="flex flex-wrap gap-4">
        <label>Yıllık indirim % <input type="number" value={f.yearly_discount} onChange={(e) => setF({ ...f, yearly_discount: e.target.value })} className={`${input} w-20`} /></label>
        <label>Deneme süresi (gün) <input type="number" value={f.trial_days} onChange={(e) => setF({ ...f, trial_days: e.target.value })} className={`${input} w-20`} /></label>
        <label>Görüntüleme süresi (gün) <input type="number" value={f.grace_days} onChange={(e) => setF({ ...f, grace_days: e.target.value })} className={`${input} w-20`} /></label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} placeholder="Banka adı" className={input} />
        <input value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} placeholder="Alıcı adı" className={input} />
        <input value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value })} placeholder="IBAN (TR…)" className={`${input} font-mono`} />
      </div>
      <p className="text-[12px] text-gray-500">Banka bilgileri koçların Abonelik sayfasında görünür. Önizleme: {sortTiers(settings.tiers).map((t) => `${t.max ?? 'sınırsız'}: ${fmtTL(t.price)}`).join(' · ')}</p>
      <button type="button" onClick={save} className={`${btn} bg-[var(--accent)] text-white`}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</button>
    </div>
  );
}
