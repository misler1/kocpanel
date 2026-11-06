'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconPlus, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react';
import { phoneKey } from '@/lib/student-account';

export type StaffRow = {
  id: string; status: string; title: string | null; full_name: string; phone: string | null; email: string | null; pending: boolean;
};
type Row = { fullName: string; phone: string; status: 'dorm_manager' | 'dorm_supervisor'; title: string };
type Result = { name: string; phone: string; status: 'olusturuldu' | 'atlandi'; password?: string; reason?: string };

const EMPTY_ROW: Row = { fullName: '', phone: '', status: 'dorm_supervisor', title: 'Belletmen' };

/** "Ad Soyad: 05XX..." ya da "Ad Soyad 05XX..." satırlarını okur; unvan "müdür" içeriyorsa yurt yöneticisi sayılır */
function parseList(text: string): Row[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const m = line.match(/^(.*?)[\s:;,-]*((?:\+?90|0)?\s*5\d{2}[\s\d]{7,12})\s*(?:[,;-]\s*(.+))?$/);
    if (!m) return [];
    const fullName = m[1].replace(/^[^:]*?(müdür[^:]*|belletmen)\s*:\s*/i, '').trim();
    const title = (m[3] ?? line.match(/(akşam müdür yardımcısı|müdür yardımcısı|müdür|belletmen)/i)?.[1] ?? '').trim();
    const manager = /müdür/i.test(title);
    return [{ fullName, phone: m[2].replace(/\s/g, ''), status: manager ? 'dorm_manager' : 'dorm_supervisor', title: title || (manager ? 'Müdür' : 'Belletmen') } as Row];
  });
}

const ROLE_DESC = {
  dorm_manager: 'Öğrenci bilgileri, deneme, haftalık takip, konu ilerleyişi (görür ve düzenler), ajanda, mesajlar',
  dorm_supervisor: 'Öğrenci listesi; deneme, program ve günlük (yalnızca görür); haftalık takip ve konu ilerleyişi (düzenler); ajanda, mesajlar',
};

export function PersonelClient({ kurumlar, staff }: { kurumlar: { name: string; count: number }[]; staff: StaffRow[] }) {
  const router = useRouter();
  const [kurum, setKurum] = useState(kurumlar.find((k) => /hüdayi/i.test(k.name))?.name ?? kurumlar[0]?.name ?? '');
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function create() {
    setError('');
    if (!kurum) return setError('Kurum seçin.');
    const list = rows.filter((r) => r.fullName.trim() || r.phone.trim());
    if (!list.length) return setError('En az bir personel ekleyin.');
    if (list.some((r) => !r.fullName.trim() || !phoneKey(r.phone))) return setError('Her satırda ad soyad ve geçerli bir telefon olmalı.');
    if (!confirm(`${list.length} personel hesabı "${kurum}" kurumu için açılacak. Devam edilsin mi?`)) return;
    setBusy(true);
    const res = await fetch('/api/personel/olustur', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kurum, people: list }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Hesaplar açılamadı.');
    setResults(json.results ?? []);
    setRows([]);
    router.refresh();
  }

  const credentialsText = (results ?? []).filter((r) => r.password)
    .map((r) => `${r.name}\nGiriş: www.kocdefterim.com.tr/giris\nTelefon: ${r.phone}\nİlk şifre: ${r.password}`).join('\n\n');

  const input = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] focus:border-[var(--accent)] focus:outline-none';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/ayarlar" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Ayarlara dön"><IconArrowLeft size={18} /></Link>
        <h1 className="text-[20px] font-semibold text-gray-900">Kurum personeli</h1>
      </div>
      <p className="text-[13px] text-gray-500">
        Personel telefon numarası ve ilk şifreyle giriş yapar. İlk girişte şifresini değiştirir ve e-posta adresini ekler;
        e-posta eklenince hoş geldiniz e-postası gider. Personel yalnızca seçtiğiniz kurumdaki öğrencilerinizi görür.
      </p>

      {results && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="mb-2 text-[15px] font-semibold text-emerald-900">Sonuç</h2>
          <p className="mb-3 text-[12.5px] text-emerald-800">İlk şifreler yalnızca şimdi gösterilir. Kopyalayıp personele iletin.</p>
          <ul className="space-y-1.5 text-[13px]">
            {results.map((r) => (
              <li key={r.phone} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <b className="text-gray-900">{r.name}</b>
                <span className="text-gray-600">{r.phone}</span>
                {r.status === 'olusturuldu'
                  ? <span>İlk şifre: <code className="rounded bg-white px-1.5 py-0.5 font-bold tracking-wider">{r.password}</code></span>
                  : <span className="text-rose-700">Açılmadı: {r.reason}</span>}
              </li>
            ))}
          </ul>
          {credentialsText && (
            <button type="button" onClick={() => { navigator.clipboard.writeText(credentialsText); setCopied(true); }}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700">
              {copied ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied ? 'Kopyalandı' : 'Giriş bilgilerini kopyala'}
            </button>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-gray-900">Yeni hesaplar</h2>
        <label className="mb-3 block text-[12.5px] font-medium text-gray-600">Kurum
          <select value={kurum} onChange={(e) => setKurum(e.target.value)} className={`${input} mt-1`}>
            {kurumlar.length === 0 && <option value="">Öğrencilerinizde kurum bilgisi yok</option>}
            {kurumlar.map((k) => <option key={k.name} value={k.name}>{k.name} ({k.count} öğrenci)</option>)}
          </select>
        </label>

        <details className="mb-3 rounded-lg border border-dashed border-gray-200 p-2.5 text-[12.5px]">
          <summary className="cursor-pointer font-medium text-gray-600">Listeyi yapıştır (her satıra bir kişi)</summary>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} className={`${input} mt-2`}
            placeholder={'Ad Soyad: 05XX XXX XX XX, Müdür\nAd Soyad: 05XX XXX XX XX, Belletmen'} />
          <button type="button" onClick={() => { const parsed = parseList(paste); if (parsed.length) { setRows(parsed); setPaste(''); } else setError('Listeden kimse okunamadı; "Ad Soyad: 05XX..., Unvan" biçiminde yazın.'); }}
            className="mt-1.5 rounded-lg border border-gray-200 px-3 py-1 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50">Satırlara aktar</button>
          <p className="mt-1 text-[11.5px] text-gray-500">Unvanında “müdür” geçenler yurt yöneticisi, diğerleri belletmen olarak işaretlenir; aşağıda değiştirebilirsiniz.</p>
        </details>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]">
              <input className={input} placeholder="Ad soyad" value={r.fullName} onChange={(e) => update(i, { fullName: e.target.value })} />
              <input className={input} placeholder="05XX XXX XX XX" inputMode="tel" value={r.phone} onChange={(e) => update(i, { phone: e.target.value })} />
              <select className={input} value={r.status} onChange={(e) => update(i, { status: e.target.value as Row['status'] })}>
                <option value="dorm_manager">Yurt yöneticisi</option>
                <option value="dorm_supervisor">Belletmen</option>
              </select>
              <input className={input} placeholder="Unvan (ör. Müdür)" value={r.title} onChange={(e) => update(i, { title: e.target.value })} />
              <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Satırı sil"
                className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><IconTrash size={16} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((x) => [...x, { ...EMPTY_ROW }])}
          className="mt-2 flex items-center gap-1 text-[13px] font-medium text-[var(--accent-dark)]"><IconPlus size={15} /> Satır ekle</button>

        <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-3 text-[12px] text-gray-600">
          <div><b>Yurt yöneticisi:</b> {ROLE_DESC.dorm_manager}</div>
          <div><b>Belletmen:</b> {ROLE_DESC.dorm_supervisor}</div>
        </div>

        {error && <p className="mt-3 text-[13px] text-rose-600">{error}</p>}
        <button type="button" onClick={create} disabled={busy || rows.length === 0}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {busy ? 'Hesaplar açılıyor…' : 'Hesapları oluştur'}
        </button>
      </section>

      {staff.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-[15px] font-semibold text-gray-900">Mevcut personel</h2>
          <ul className="divide-y divide-gray-100 text-[13px]">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                <b className="text-gray-900">{s.full_name}</b>
                <span className="text-gray-500">{s.title ?? (s.status === 'dorm_manager' ? 'Yurt yöneticisi' : 'Belletmen')}</span>
                <span className="text-gray-500">{s.phone}</span>
                <span className="text-gray-500">{s.email ?? 'e-posta yok'}</span>
                {s.pending && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800">henüz giriş yapmadı</span>}
                <Link href={`/ayarlar/ogretmenler/${s.id}`} className="ml-auto text-[12.5px] text-[var(--accent-dark)] hover:underline">İzinler</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
