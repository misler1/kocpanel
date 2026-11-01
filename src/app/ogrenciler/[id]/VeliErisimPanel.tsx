'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { IconShare, IconCopy, IconExternalLink, IconUserPlus, IconTrash } from '@tabler/icons-react';
import { Accordion } from './OgrenciDetayClient';

const btn = 'inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50';
const ghost = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50';
const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Öğrenci detayında: veliye rapor linki gönderme + veli hesabı açma. */
export function VeliErisimPanel({ student }: { student: any }) {
  return (
    <Accordion icon={<IconShare size={16} />} title="Veli erişimi">
      <div className="space-y-6">
        <RaporLinkleri studentId={student.id} />
        <VeliHesaplari student={student} />
      </div>
    </Accordion>
  );
}

function RaporLinkleri({ studentId }: { studentId: string }) {
  const [links, setLinks] = useState<any[] | null>(null);
  const [days, setDays] = useState('14');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/veli/rapor-linki?studentId=${studentId}`);
    const json = await res.json().catch(() => ({}));
    setLinks(res.ok ? json.links : []);
    if (!res.ok) setMsg(json.error ?? 'Linkler yüklenemedi.');
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const url = (token: string) => `${window.location.origin}/rapor/${token}`;

  async function create() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/veli/rapor-linki', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, days: Number(days), note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.error ?? 'Link oluşturulamadı.'); return; }
    setNote('');
    setLinks((p) => [json.link, ...(p ?? [])]);
    copy(json.link.token);
  }

  async function copy(token: string) {
    try { await navigator.clipboard.writeText(url(token)); setCopied(token); setTimeout(() => setCopied(null), 2500); }
    catch { setMsg(url(token)); }
  }

  async function revoke(id: string) {
    if (!confirm('Bu link kapatılsın mı? Veli artık raporu açamaz.')) return;
    const res = await fetch('/api/veli/rapor-linki', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) setLinks((p) => (p ?? []).map((l) => (l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l)));
  }

  const now = Date.now();
  return (
    <div>
      <h3 className="mb-1 text-[13px] font-semibold text-gray-900">Rapor linki</h3>
      <p className="mb-3 text-[12.5px] text-gray-500">
        Veliye gönderebileceğiniz, giriş gerektirmeyen salt okunur gelişim raporu: haftalık program, çözülen sorular,
        çalışma serisi ve denemeler. Rapor her açılışta güncel veriyle oluşur; sayfadan PDF olarak da indirilebilir.
      </p>
      <div className="space-y-2 rounded-lg bg-gray-50 p-3">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1500}
          placeholder="Veliye not (isteğe bağlı) — raporun başında görünür" className={field} />
        <div className="flex flex-wrap items-center gap-2">
          <select value={days} onChange={(e) => setDays(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px]">
            <option value="7">7 gün geçerli</option>
            <option value="14">14 gün geçerli</option>
            <option value="30">30 gün geçerli</option>
            <option value="90">90 gün geçerli</option>
          </select>
          <button type="button" disabled={busy} onClick={create} className={btn}><IconShare size={15} /> Link oluştur ve kopyala</button>
        </div>
      </div>
      {msg && <p className="mt-2 break-all rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] text-blue-700">{msg}</p>}

      {links && links.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100">
          {links.map((l) => {
            const expired = new Date(l.expires_at).getTime() < now;
            const active = !l.revoked_at && !expired;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-2 py-2 text-[12.5px]">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {l.revoked_at ? 'Kapatıldı' : expired ? 'Süresi doldu' : 'Aktif'}
                </span>
                <span className="min-w-0 flex-1 text-gray-600">
                  {fmtDate(l.created_at)} · son gün {fmtDate(l.expires_at)} · {l.view_count} görüntülenme
                  {l.note && <span className="block truncate text-gray-400">“{l.note}”</span>}
                </span>
                {active && (
                  <span className="flex gap-1.5">
                    <button type="button" onClick={() => copy(l.token)} className={ghost}><IconCopy size={14} /> {copied === l.token ? 'Kopyalandı' : 'Kopyala'}</button>
                    <a href={`/rapor/${l.token}`} target="_blank" rel="noreferrer" className={ghost}><IconExternalLink size={14} /> Aç</a>
                    <button type="button" onClick={() => revoke(l.id)} className="rounded-lg px-2 text-[12.5px] text-red-600 hover:bg-red-50">Kapat</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VeliHesaplari({ student }: { student: any }) {
  const [parents, setParents] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const suggestions = [
    { label: 'Anne', name: student.mother_name, phone: student.mother_phone },
    { label: 'Baba', name: student.father_name, phone: student.father_phone },
    { label: student.guardian_relation || 'Veli', name: student.guardian_name, phone: student.guardian_phone },
  ].filter((s) => s.phone);

  async function load() {
    const res = await fetch(`/api/veli/hesap?studentId=${student.id}`);
    const json = await res.json().catch(() => ({}));
    setParents(res.ok ? json.parents : []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  async function create() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/veli/hesap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id, fullName, phone }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.error ?? 'Hesap açılamadı.'); return; }
    setMsg(json.created
      ? `Veli hesabı açıldı. Giriş: kocdefterim.com.tr/giris/veli · Kullanıcı adı: ${phone} · İlk şifre: ${json.password} (ilk girişte değiştirmesi istenecek). Bu bilgiyi veliye iletin.`
      : 'Bu telefonla zaten bir veli hesabı vardı; öğrenciye bağlandı. Veli mevcut şifresiyle giriş yapabilir.');
    setOpen(false); setFullName(''); setPhone('');
    load();
  }

  async function unlink(parentId: string) {
    if (!confirm('Velinin bu öğrenciye erişimi kaldırılsın mı?')) return;
    const res = await fetch('/api/veli/hesap', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, parentId }) });
    if (res.ok) load();
  }

  return (
    <div>
      <h3 className="mb-1 text-[13px] font-semibold text-gray-900">Veli hesabı</h3>
      <p className="mb-3 text-[12.5px] text-gray-500">
        Veli kendi telefonuyla <span className="font-medium">/giris/veli</span> adresinden giriş yapar ve çocuğunun raporunu her zaman güncel görür.
        Kardeşler aynı veli hesabına bağlanabilir.
      </p>

      {parents && parents.length > 0 && (
        <ul className="mb-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 text-gray-900">{p.full_name} <span className="text-gray-500">· {p.phone}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${p.pending ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {p.pending ? 'Henüz giriş yapmadı' : 'Aktif'}
              </span>
              <button type="button" onClick={() => unlink(p.id)} title="Erişimi kaldır" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><IconTrash size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {msg && <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] text-blue-800">{msg}</p>}

      {open ? (
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s.label} type="button" onClick={() => { setFullName(s.name ?? ''); setPhone(s.phone ?? ''); }}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[12px] text-gray-700 hover:border-blue-400">
                  {s.label}{s.name ? `: ${s.name}` : ''}
                </button>
              ))}
            </div>
          )}
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Veli adı soyadı" className={field} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Veli telefonu (05XX XXX XX XX)" className={field} />
          <p className="text-[12px] text-gray-500">İlk şifre: veli telefonunun son 4 hanesi + öğrencinin doğum yılı.</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={create} className={btn}>Hesabı aç</button>
            <button type="button" onClick={() => setOpen(false)} className={ghost}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className={ghost}><IconUserPlus size={15} /> Veli hesabı aç</button>
      )}
    </div>
  );
}
