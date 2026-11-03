'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconAlarm, IconPlus, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { Accordion } from './OgrenciDetayClient';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']; // Pazartesi=0 (supabase/study_reminders.sql)
const MAX_TIMES = 3;

/** Öğrenci detayında: günlük çalışma hatırlatmasının saatleri ve günleri. */
export function HatirlatmaPanel({ studentId, coachId, times: initialTimes, days: initialDays, hasAccount, pushOn }: {
  studentId: string; coachId: string; times: string[]; days: number[]; hasAccount: boolean; pushOn: boolean;
}) {
  const supabase = createClient();
  const [times, setTimes] = useState<string[]>(initialTimes.map((t) => t.slice(0, 5)));
  const [days, setDays] = useState<number[]>(initialDays);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggleDay(d: number) {
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));
  }

  function values() {
    const clean = [...new Set(times.filter(Boolean))].sort();
    if (clean.length > 0 && days.length === 0) return { error: 'En az bir gün seçin.' };
    return { reminder_times: clean, reminder_days: days };
  }

  async function save() {
    const v = values();
    if ('error' in v) { setMsg({ ok: false, text: v.error! }); return; }
    setBusy(true); setMsg(null);
    const { error } = await (supabase.from('students') as any).update(v).eq('id', studentId);
    setBusy(false);
    if (error) { setMsg({ ok: false, text: 'Kaydedilemedi: ' + error.message }); return; }
    setTimes(v.reminder_times);
    setMsg({ ok: true, text: v.reminder_times.length ? 'Hatırlatma kaydedildi.' : 'Hatırlatma kapatıldı.' });
  }

  async function applyToAll() {
    const v = values();
    if ('error' in v) { setMsg({ ok: false, text: v.error! }); return; }
    if (!confirm(v.reminder_times.length
      ? `Bu saatler (${v.reminder_times.join(', ')}) ve günler tüm aktif öğrencilerinize uygulansın mı? Öğrencilerin mevcut hatırlatma ayarları değişir.`
      : 'Tüm aktif öğrencilerinizin hatırlatması kapatılsın mı?')) return;
    setBusy(true); setMsg(null);
    const { data, error } = await (supabase.from('students') as any).update(v)
      .eq('coach_id', coachId).neq('status', 'pasif').select('id');
    setBusy(false);
    if (error) { setMsg({ ok: false, text: 'Uygulanamadı: ' + error.message }); return; }
    setMsg({ ok: true, text: `${data?.length ?? 0} öğrenciye uygulandı.` });
  }

  const summary = times.filter(Boolean).length
    ? `${times.filter(Boolean).sort().join(', ')}`
    : 'Kapalı';

  return (
    <Accordion icon={<IconAlarm size={16} />} title={`Çalışma hatırlatması · ${summary}`}>
      <p className="mb-3 text-[12.5px] leading-relaxed text-gray-500">
        Seçtiğiniz saatlerde öğrenciye “Günlüğünü doldurma zamanı” bildirimi gider; dokununca doğrudan bugünün görevleri açılır.
        O günün görevlerini zaten işaretlediyse hatırlatma gönderilmez.
      </p>

      {!hasAccount ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          Öğrencinin henüz panel hesabı yok; hesap açılınca hatırlatmalar başlar.
        </p>
      ) : !pushOn && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          Öğrenci telefon bildirimlerini henüz açmamış; hatırlatmayı yalnızca paneldeki 🔔 zilde görür. Öğrenciden uygulamayı
          ana ekrana ekleyip zil menüsünden “Bildirimler telefonuma da gelsin”e dokunmasını isteyin.
        </p>
      )}

      <div className="mb-3">
        <div className="mb-1.5 text-[12.5px] font-medium text-gray-700">Saatler</div>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t, i) => (
            <span key={i} className="flex items-center gap-1 rounded-lg border border-gray-200 py-0.5 pl-2 pr-1">
              <input type="time" value={t} step={300}
                onChange={(e) => setTimes((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                className="text-[13px] outline-none" />
              <button type="button" onClick={() => setTimes((p) => p.filter((_, j) => j !== i))}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Saati kaldır">
                <IconX size={14} />
              </button>
            </span>
          ))}
          {times.length < MAX_TIMES && (
            <button type="button" onClick={() => setTimes((p) => [...p, p.length ? '22:00' : '20:00'])}
              className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-[12.5px] text-gray-600 hover:border-gray-400 hover:text-gray-900">
              <IconPlus size={14} /> Saat ekle
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[12.5px] font-medium text-gray-700">Günler</div>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((label, d) => {
            const on = days.includes(d);
            return (
              <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={on}
                className={`w-11 rounded-lg border py-1.5 text-[12.5px] font-medium transition-colors ${on
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" onClick={applyToAll} disabled={busy}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Tüm öğrencilerime uygula
        </button>
        {msg && <span className={`text-[12.5px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </Accordion>
  );
}
