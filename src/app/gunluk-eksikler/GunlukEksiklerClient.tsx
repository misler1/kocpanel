'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconMessage, IconCalendarEvent, IconBellOff, IconBell, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES } from '@/lib/program-days';
import { shiftDate, weekdayIndex, type TaskRow } from '@/lib/day-tasks';
import { MUTE_FOREVER, type MdResult, type MdRow, type MdStudent } from '@/lib/missing-daily';

const fmt = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}`;
const MUTE_OPTIONS: { label: string; days: number | null }[] = [
  { label: '3 gün', days: 3 }, { label: '1 hafta', days: 7 }, { label: '2 hafta', days: 14 }, { label: '1 ay', days: 30 }, { label: 'Süresiz', days: null },
];
const REASONS = ['İzinli', 'Hasta', 'Tatilde'];

function taskText(t: TaskRow) {
  const target = t.target_count ? `${t.target_count} soru` : t.topic_target_minutes ? `${t.topic_target_minutes} dk` : '';
  return [t.subject, t.topic, t.resource_name].filter(Boolean).join(' — ') + (target ? ` (${target})` : '');
}

export function GunlukEksiklerClient({ day, today, result, muteReady }: { day: string; today: string; result: MdResult; muteReady: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [muteFor, setMuteFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const yesterday = shiftDate(today, -1);
  const dayTitle = day === yesterday ? 'Dün' : day === today ? 'Bugün' : fmt(day);

  async function openMessage(s: MdStudent) {
    if (!s.profile_id) return;
    setBusy(s.id); setMsg(null);
    const { data, error } = await (supabase as any).rpc('start_direct_conversation', { p_other: s.profile_id });
    setBusy(null);
    if (error || !data) { setMsg({ ok: false, text: 'Sohbet açılamadı: ' + (error?.message ?? '') }); return; }
    router.push(`/mesajlar?c=${data}`);
  }

  async function setMute(s: MdStudent, until: string | null, reason: string | null) {
    setBusy(s.id); setMsg(null);
    const { error } = await (supabase.from('students') as any)
      .update({ daily_alert_muted_until: until, daily_alert_mute_reason: until ? reason : null }).eq('id', s.id);
    setBusy(null);
    if (error) { setMsg({ ok: false, text: 'Kaydedilemedi: ' + error.message }); return; }
    setMuteFor(null);
    setMsg({ ok: true, text: until
      ? `${s.full_name} için günlük bildirimi ${until === MUTE_FOREVER ? 'süresiz' : fmt(until) + ' tarihine kadar'} kapatıldı.`
      : `${s.full_name} için günlük bildirimi yeniden açıldı.` });
    router.refresh();
  }

  function studentRow(row: MdRow, kind: 'missing' | 'partial') {
    const s = row.student;
    return (
      <li key={s.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/ogrenciler/${s.id}`} className="text-[15px] font-bold text-gray-900 hover:underline">{s.full_name}</Link>
            {s.sinif_sube && <span className="ml-1.5 text-[12px] text-gray-400">{s.sinif_sube}</span>}
            <p className="text-[12.5px] text-gray-500">
              {kind === 'missing'
                ? row.tasks.length ? `${row.tasks.length} görevi vardı, hiçbirini işaretlemedi` : 'Bu gün için programı yoktu, günlük de girmedi'
                : `${row.marked}/${row.tasks.length} görev işaretli${row.hasLog ? ' · çalışma kaydı var' : ''}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={busy === s.id} onClick={() => openMessage(s)}
              className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50">
              <IconMessage size={15} /> Mesaj
            </button>
            <Link href={`/ogrenciler/${s.id}?sekme=program`}
              className="flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-50">
              <IconCalendarEvent size={15} /> Program
            </Link>
            {muteReady && (
              <button type="button" onClick={() => setMuteFor(muteFor === s.id ? null : s.id)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold ${muteFor === s.id ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                <IconBellOff size={15} /> Bildirimi kapat
              </button>
            )}
          </div>
        </div>
        {row.unmarked.length > 0 && kind === 'partial' && (
          <ul className="mt-2 space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            <li className="font-semibold">İşaretlenmemiş görevler:</li>
            {row.unmarked.map((t) => <li key={t.id}>• {taskText(t)}</li>)}
          </ul>
        )}
        {kind === 'missing' && row.tasks.length > 0 && (
          <details className="mt-1.5 text-[12.5px] text-gray-600">
            <summary className="cursor-pointer select-none text-gray-500">Görevleri göster</summary>
            <ul className="mt-1 space-y-0.5 pl-1">{row.tasks.map((t) => <li key={t.id}>• {taskText(t)}</li>)}</ul>
          </details>
        )}
        {muteFor === s.id && <MutePanel student={s} busy={busy === s.id} onSave={setMute} onClose={() => setMuteFor(null)} />}
      </li>
    );
  }

  const { missing, partial, muted } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-12">
      <div className="flex items-center gap-2">
        <Link href="/anasayfa" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Ana sayfaya dön"><IconArrowLeft size={20} /></Link>
        <h1 className="text-[20px] font-bold text-gray-900">Günlük girmeyenler</h1>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm ring-1 ring-gray-100">
        <Link href={`/gunluk-eksikler?gun=${shiftDate(day, -1)}`} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Önceki gün"><IconChevronLeft size={20} /></Link>
        <div className="text-center">
          <div className="text-[16px] font-bold text-gray-900">{dayTitle}</div>
          <div className="text-[12.5px] text-gray-500">{fmt(day)} {DAY_NAMES[weekdayIndex(day)]}</div>
        </div>
        {day < today
          ? <Link href={`/gunluk-eksikler?gun=${shiftDate(day, 1)}`} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Sonraki gün"><IconChevronRight size={20} /></Link>
          : <span className="w-9" />}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-rose-50 py-2.5"><div className="text-[20px] font-bold text-rose-700">{missing.length}</div><div className="text-[11.5px] text-rose-700">hiç girmedi</div></div>
        <div className="rounded-2xl bg-amber-50 py-2.5"><div className="text-[20px] font-bold text-amber-700">{partial.length}</div><div className="text-[11.5px] text-amber-700">eksik girdi</div></div>
        <div className="rounded-2xl bg-emerald-50 py-2.5"><div className="text-[20px] font-bold text-emerald-700">{result.complete}</div><div className="text-[11.5px] text-emerald-700">tam girdi</div></div>
      </div>

      {day === today && <p className="rounded-xl bg-sky-50 px-3 py-2 text-[12.5px] text-sky-800">Bugün henüz bitmedi; öğrenciler gün içinde girmeye devam edebilir.</p>}
      {!muteReady && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Bildirim kapatma için Supabase&apos;de <b>supabase/gunluk_eksikler.sql</b> çalıştırılmalı.</p>}
      {msg && (
        <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] font-medium ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          <span className="flex-1">{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Kapat"><IconX size={16} /></button>
        </p>
      )}

      <section className="space-y-2">
        <h2 className="px-1 text-[15px] font-bold text-gray-900">🔴 Hiç girmeyenler</h2>
        {missing.length
          ? <ul className="space-y-2">{missing.map((r) => studentRow(r, 'missing'))}</ul>
          : <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-5 text-center text-[13px] text-gray-400">Herkes bir şey girmiş 👏</p>}
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-[15px] font-bold text-gray-900">🟠 Eksik girenler</h2>
        {partial.length
          ? <ul className="space-y-2">{partial.map((r) => studentRow(r, 'partial'))}</ul>
          : <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-5 text-center text-[13px] text-gray-400">Eksik giren yok.</p>}
      </section>

      {muted.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-[15px] font-bold text-gray-900">🔕 Bildirimi kapalı olanlar</h2>
          <ul className="space-y-1.5">
            {muted.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-gray-100">
                <div className="min-w-0 flex-1">
                  <Link href={`/ogrenciler/${s.id}`} className="text-[14px] font-semibold text-gray-800 hover:underline">{s.full_name}</Link>
                  <p className="text-[12px] text-gray-500">
                    {s.muted_until === MUTE_FOREVER ? 'Süresiz' : `${fmt(s.muted_until!)} tarihine kadar`}{s.mute_reason ? ` · ${s.mute_reason}` : ''}
                  </p>
                </div>
                <button type="button" disabled={busy === s.id} onClick={() => setMute(s, null, null)}
                  className="flex items-center gap-1 rounded-full border border-emerald-200 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                  <IconBell size={15} /> Aç
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-[12px] leading-relaxed text-gray-400">
        Listede yer almaz: sisteme henüz ilk girişini yapmamış öğrenciler{result.notSignedIn ? ` (${result.notSignedIn})` : ''},
        pasif öğrenciler ve hatırlatma günlerinden bu günü çıkardığınız öğrenciler{result.offDay ? ` (${result.offDay})` : ''}.
      </p>
    </div>
  );
}

function MutePanel({ student, busy, onSave, onClose }: {
  student: MdStudent; busy: boolean; onSave: (s: MdStudent, until: string | null, reason: string | null) => void; onClose: () => void;
}) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const save = (until: string) => onSave(student, until, reason.trim() || null);
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800">&quot;Günlük girmedi&quot; bildirimi ne kadar kapalı kalsın?</p>
        <button type="button" onClick={onClose} className="text-gray-400" aria-label="Kapat"><IconX size={16} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(reason === r ? '' : r)}
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${reason === r ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>{r}</button>
        ))}
        <input value={REASONS.includes(reason) ? '' : reason} onChange={(e) => setReason(e.target.value)} maxLength={80}
          placeholder="Neden? (isteğe bağlı)" className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[13px]" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MUTE_OPTIONS.map((o) => (
          <button key={o.label} type="button" disabled={busy} onClick={() => save(o.days == null ? MUTE_FOREVER : shiftDate(today, o.days - 1))}
            className="rounded-full bg-gray-800 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-gray-700 disabled:opacity-50">{o.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[12.5px] text-gray-600">
        <span>ya da şu tarihe kadar:</span>
        <input type="date" min={today} value={custom} onChange={(e) => setCustom(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[13px]" />
        <button type="button" disabled={busy || !custom} onClick={() => save(custom)}
          className="rounded-full bg-gray-800 px-3 py-1 font-semibold text-white disabled:opacity-40">Kapat</button>
      </div>
      <p className="text-[11.5px] text-gray-500">Seçilen tarih dahil bildirim gelmez; sonra kendiliğinden açılır. İstediğiniz zaman bu sayfadan geri açabilirsiniz.</p>
    </div>
  );
}
