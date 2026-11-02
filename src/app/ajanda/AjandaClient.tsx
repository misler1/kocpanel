'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconCalendarWeek, IconChevronLeft, IconChevronRight, IconPlus, IconX, IconUser, IconSchool, IconUserQuestion,
  IconClock, IconMapPin, IconNotes, IconTrash,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { PageHero } from '@/components/ui/PageHero';

type Student = { id: string; full_name: string; sinif_sube?: string | null };
type Staff = { id: string; full_name: string; role: string };
type Appt = {
  id: string; owner_id: string; starts_at: string; duration_minutes: number; title: string | null; note: string | null;
  location: string | null; student_id: string | null; participant_id: string | null; other_name: string | null; status: string;
  change_request_at?: string | null; change_request_note?: string | null; change_requested_at?: string | null;
};
type MeetingRec = { id: string; student_id: string; scheduled_at: string; duration_minutes: number | null; meeting_type: string | null; topic: string | null };

type Kind = 'ogrenci' | 'ogretmen' | 'diger';
type Draft = {
  id: string | null; date: string; time: string; duration: number; kind: Kind;
  studentId: string; participantId: string; otherName: string; title: string; location: string; note: string;
};

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const START_HOUR = 7;
const END_HOUR = 23; // son satır 22:00-23:00
const HOUR_PX = 56;
const DURATIONS = [15, 20, 30, 40, 45, 50, 60, 75, 90, 120];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = m.getDay();
  m.setDate(m.getDate() + (dow === 0 ? -6 : 1 - dow));
  return m;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Renkler: öğrenci mor, öğretmen/koç turkuaz, diğer turuncu, görüşme kaydı gri
const KIND_STYLE: Record<Kind | 'kayit', string> = {
  ogrenci: 'border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200',
  ogretmen: 'border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200',
  diger: 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200',
  kayit: 'border-slate-300 border-dashed bg-slate-50 text-slate-700 hover:bg-slate-100',
};

type CalItem = { key: string; start: Date; minutes: number; label: string; sub: string; style: string; onClick: () => void; flag?: boolean };

/** Aynı günde çakışan etkinlikleri yan yana sütunlara böler */
function layout(items: CalItem[]) {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
  const lanesEnd: number[] = [];
  const placed = sorted.map((it) => {
    const s = it.start.getTime();
    let lane = lanesEnd.findIndex((end) => end <= s);
    if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
    lanesEnd[lane] = s + it.minutes * 60_000;
    return { it, lane };
  });
  const lanes = Math.max(1, lanesEnd.length);
  return placed.map((p) => ({ ...p, lanes }));
}

export function AjandaClient({ meId, students, staff }: { meId: string; students: Student[]; staff: Staff[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [appts, setAppts] = useState<Appt[]>([]);
  const [records, setRecords] = useState<MeetingRec[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<Appt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState(() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; });
  const [setupMissing, setSetupMissing] = useState(false);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);
  const staffName = useMemo(() => new Map(staff.map((p) => [p.id, p.full_name])), [staff]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();
    const { data, error: err } = await (supabase as any).from('appointments')
      .select('*')
      .gte('starts_at', from).lt('starts_at', to).eq('status', 'planlandi').order('starts_at');
    if (err) { setSetupMissing(err.code === '42P01' || err.code === 'PGRST205'); setAppts([]); }
    else { setSetupMissing(false); setAppts(data ?? []); }

    // Bu haftanın görüşme kayıtları da takvimde (salt okunur) görünsün
    const ids = students.map((s) => s.id);
    const recs: MeetingRec[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const { data: m } = await (supabase as any).from('meetings')
        .select('id, student_id, scheduled_at, duration_minutes, meeting_type, topic')
        .in('student_id', ids.slice(i, i + 100)).gte('scheduled_at', from).lt('scheduled_at', to);
      recs.push(...(m ?? []));
    }
    setRecords(recs);
  }, [supabase, weekStart, students]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const kindOf = (a: Appt): Kind => (a.student_id ? 'ogrenci' : a.participant_id ? 'ogretmen' : 'diger');
  const whoOf = (a: Appt) =>
    a.student_id ? studentName.get(a.student_id) ?? 'Öğrenci'
      : a.participant_id ? (a.participant_id === meId ? staffName.get(a.owner_id) ?? 'Koç' : staffName.get(a.participant_id) ?? 'Öğretmen')
        : a.other_name ?? '';

  function openNew(date: Date, minutes?: number) {
    const t = minutes ?? 15 * 60;
    setError(null);
    setDraft({
      id: null, date: ymd(date), time: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, duration: 40, kind: 'ogrenci',
      studentId: '', participantId: '', otherName: '', title: '', location: '', note: '',
    });
  }

  function openEdit(a: Appt) {
    setError(null);
    if (a.owner_id !== meId) { setViewing(a); return; }
    const d = new Date(a.starts_at);
    setDraft({
      id: a.id, date: ymd(d), time: hm(d), duration: a.duration_minutes, kind: kindOf(a),
      studentId: a.student_id ?? '', participantId: a.participant_id ?? '', otherName: a.other_name ?? '',
      title: a.title ?? '', location: a.location ?? '', note: a.note ?? '',
    });
  }

  async function save() {
    if (!draft) return;
    if (draft.kind === 'ogrenci' && !draft.studentId) { setError('Öğrenci seçin.'); return; }
    if (draft.kind === 'ogretmen' && !draft.participantId) { setError('Öğretmen/koç seçin.'); return; }
    if (draft.kind === 'diger' && !draft.otherName.trim() && !draft.title.trim()) { setError('Kiminle görüşeceğinizi ya da bir başlık yazın.'); return; }
    setBusy(true); setError(null);
    const startsAt = new Date(`${draft.date}T${draft.time}:00`);
    const { error: err } = await (supabase as any).rpc('save_appointment', {
      p_id: draft.id, p_starts_at: startsAt.toISOString(), p_duration: draft.duration,
      p_title: draft.title, p_note: draft.note, p_location: draft.location,
      p_student_id: draft.kind === 'ogrenci' ? draft.studentId : null,
      p_participant_id: draft.kind === 'ogretmen' ? draft.participantId : null,
      p_other_name: draft.kind === 'diger' ? draft.otherName : null,
    });
    setBusy(false);
    if (err) { setError(err.code === 'PGRST202' ? 'Ajanda henüz etkin değil (veritabanı kurulumu bekleniyor).' : err.message); return; }
    setDraft(null);
    load();
  }

  async function cancel() {
    if (!draft?.id || !confirm('Bu görüşme iptal edilsin mi? Katılımcıya bildirim gider.')) return;
    setBusy(true);
    const { error: err } = await (supabase as any).rpc('cancel_appointment', { p_id: draft.id });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDraft(null);
    load();
  }

  // Takvim öğeleri (gün indeksine göre)
  const itemsByDay = useMemo(() => {
    const map: CalItem[][] = Array.from({ length: 7 }, () => []);
    for (const a of appts) {
      const d = new Date(a.starts_at);
      const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - weekStart.getTime()) / 86_400_000);
      if (idx < 0 || idx > 6) continue;
      const kind = kindOf(a);
      map[idx].push({
        key: a.id, start: d, minutes: a.duration_minutes,
        label: whoOf(a) || a.title || 'Görüşme',
        sub: [hm(d), a.title && whoOf(a) ? a.title : null].filter(Boolean).join(' · '),
        style: KIND_STYLE[kind], onClick: () => openEdit(a), flag: !!a.change_requested_at,
      });
    }
    for (const r of records) {
      const d = new Date(r.scheduled_at);
      const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - weekStart.getTime()) / 86_400_000);
      if (idx < 0 || idx > 6) continue;
      map[idx].push({
        key: `rec-${r.id}`, start: d, minutes: r.duration_minutes || 30,
        label: `${studentName.get(r.student_id) ?? 'Öğrenci'}${r.meeting_type === 'veli' ? ' (veli)' : ''}`,
        sub: `${hm(d)} · görüşme kaydı`,
        style: KIND_STYLE.kayit, onClick: () => router.push(`/gorusmeler/${r.student_id}`),
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appts, records, weekStart, studentName, staffName, router]);

  const today = ymd(new Date());
  const weekLabel = `${days[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${days[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const plannedCount = appts.length;

  const dayColumn = (i: number) => {
    const day = days[i];
    const placed = layout(itemsByDay[i]);
    return (
      <div
        className={`relative border-l border-[var(--border)] ${ymd(day) === today ? 'bg-violet-50/40' : ''}`}
        style={{ height: hours.length * HOUR_PX }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const minutes = START_HOUR * 60 + Math.floor((y / HOUR_PX) * 60 / 15) * 15;
          openNew(day, Math.min(minutes, (END_HOUR - 1) * 60 + 45));
        }}
      >
        {hours.map((h) => (
          <div key={h} className="border-t border-[var(--border)]/70" style={{ height: HOUR_PX }}>
            <div className="h-1/2 border-b border-dashed border-[var(--border)]/50" />
          </div>
        ))}
        {ymd(day) === today && <NowLine />}
        {placed.map(({ it, lane, lanes }) => {
          const top = ((it.start.getHours() + it.start.getMinutes() / 60) - START_HOUR) * HOUR_PX;
          const height = Math.max(22, (it.minutes / 60) * HOUR_PX - 2);
          if (top + height < 0 || top > hours.length * HOUR_PX) return null;
          return (
            <button
              key={it.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); it.onClick(); }}
              className={`absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11.5px] leading-tight shadow-sm transition-colors ${it.style}`}
              style={{ top: Math.max(0, top), height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
            >
              <div className="truncate font-semibold">{it.flag && <span title="Öğrenci saat değişikliği istedi">⏰ </span>}{it.label}</div>
              <div className="truncate opacity-80">{it.sub}</div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-1">
      <PageHero
        theme="teal"
        icon={<IconCalendarWeek size={22} />}
        title="Ajanda"
        subtitle={`${weekLabel} · ${plannedCount} planlı görüşme`}
        actions={
          <button type="button" onClick={() => openNew(new Date(), Math.min(Math.max(new Date().getHours() + 1, START_HOUR), END_HOUR - 1) * 60)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90">
            <IconPlus size={15} /> Görüşme planla
          </button>
        }
      />

      {setupMissing && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Ajanda için veritabanı kurulumu henüz yapılmamış (supabase/appointments.sql). Kurulumdan sonra görüşme planlayabilirsiniz.
        </p>
      )}

      {/* Hafta gezintisi ve renk açıklaması */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-lg p-1.5 hover:bg-[var(--paper)]" aria-label="Önceki hafta"><IconChevronLeft size={16} /></button>
          <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))} className="rounded-lg px-2.5 py-1 text-[12.5px] font-medium hover:bg-[var(--paper)]">Bu hafta</button>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-lg p-1.5 hover:bg-[var(--paper)]" aria-label="Sonraki hafta"><IconChevronRight size={16} /></button>
        </div>
        <span className="text-[13px] font-medium text-[var(--ink)]">{weekLabel}</span>
        <div className="ml-auto flex flex-wrap gap-2 text-[11.5px]">
          <Legend cls="bg-violet-400" label="Öğrenci" />
          <Legend cls="bg-teal-400" label="Öğretmen / koç" />
          <Legend cls="bg-amber-400" label="Diğer" />
          <Legend cls="border border-dashed border-slate-400 bg-slate-100" label="Görüşme kaydı" />
        </div>
      </div>

      {/* Mobil: gün seçici */}
      <div className="mb-2 flex gap-1 overflow-x-auto md:hidden">
        {days.map((d, i) => (
          <button key={i} type="button" onClick={() => setMobileDay(i)}
            className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-1.5 text-[11px] ${mobileDay === i ? 'bg-teal-500 text-white' : 'bg-[var(--card)] text-[var(--ink-muted)]'}`}>
            <span>{DAY_NAMES[i].slice(0, 3)}</span>
            <span className="text-[14px] font-semibold">{d.getDate()}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        {/* Gün başlıkları (masaüstü) */}
        <div className="hidden grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)] bg-gradient-to-r from-teal-50 to-white md:grid">
          <div />
          {days.map((d, i) => {
            const isToday = ymd(d) === today;
            return (
              <div key={i} className="border-l border-[var(--border)] px-2 py-2 text-center">
                <div className="text-[11.5px] font-medium text-[var(--ink-muted)]">{DAY_NAMES[i]}</div>
                <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold ${isToday ? 'bg-teal-500 text-white' : 'text-[var(--ink)]'}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Masaüstü: 7 gün */}
          <div className="hidden grid-cols-[56px_repeat(7,1fr)] md:grid">
            <HourGutter hours={hours} />
            {days.map((_, i) => <div key={i}>{dayColumn(i)}</div>)}
          </div>
          {/* Mobil: seçili gün */}
          <div className="grid grid-cols-[48px_1fr] md:hidden">
            <HourGutter hours={hours} />
            {dayColumn(mobileDay)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-[var(--ink-muted)]">Boş bir saate tıklayarak o saate görüşme planlayabilirsiniz.</p>

      {/* Planlama formu */}
      {draft && (
        <Modal title={draft.id ? 'Görüşmeyi düzenle' : 'Görüşme planla'} onClose={() => !busy && setDraft(null)}>
          <div className="space-y-3">
            {draft.id && (() => {
              const req = appts.find((a) => a.id === draft.id);
              if (!req?.change_requested_at) return null;
              const proposed = req.change_request_at ? new Date(req.change_request_at) : null;
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
                  <p className="font-semibold">⏰ Öğrenci saat değişikliği istedi</p>
                  {proposed && <p className="mt-0.5">Önerilen: <b>{proposed.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</b></p>}
                  {req.change_request_note && <p className="mt-0.5 italic">&ldquo;{req.change_request_note}&rdquo;</p>}
                  {proposed && (
                    <button type="button" onClick={() => setDraft({ ...draft, date: ymd(proposed), time: hm(proposed) })}
                      className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-amber-600">
                      Önerilen saate taşı
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={async () => {
                      setBusy(true);
                      const { error: err } = await (supabase as any).rpc('dismiss_appointment_request', { p_id: draft.id });
                      setBusy(false);
                      if (err) { setError(err.message); return; }
                      setAppts((p) => p.map((x) => (x.id === draft.id ? { ...x, change_requested_at: null, change_request_at: null, change_request_note: null } : x)));
                    }}
                    className="ml-2 mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100">
                    Saat aynı kalsın
                  </button>
                  <p className="mt-1.5 text-[11.5px] text-amber-800">Saati değiştirip kaydederseniz ya da &quot;Saat aynı kalsın&quot; derseniz öğrenciye bildirim gider ve talep kapanır.</p>
                </div>
              );
            })()}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--ink-muted)]">Kiminle?</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['ogrenci', 'Öğrenci', IconUser, 'violet'],
                  ['ogretmen', 'Öğretmen / koç', IconSchool, 'teal'],
                  ['diger', 'Diğer', IconUserQuestion, 'amber'],
                ] as [Kind, string, any, string][]).map(([k, label, Icon, c]) => (
                  <button key={k} type="button" onClick={() => setDraft({ ...draft, kind: k })}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12.5px] font-medium ${
                      draft.kind === k
                        ? c === 'violet' ? 'border-violet-400 bg-violet-100 text-violet-800' : c === 'teal' ? 'border-teal-400 bg-teal-100 text-teal-800' : 'border-amber-400 bg-amber-100 text-amber-800'
                        : 'border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--paper)]'
                    }`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {draft.kind === 'ogrenci' && (
              <Field label="Öğrenci">
                <select value={draft.studentId} onChange={(e) => setDraft({ ...draft, studentId: e.target.value })} className={inputCls}>
                  <option value="">Öğrenci seçin…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.sinif_sube ? ` · ${s.sinif_sube}` : ''}</option>)}
                </select>
                <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Öğrencinin hesabı varsa paneline bildirim gider.</p>
              </Field>
            )}
            {draft.kind === 'ogretmen' && (
              <Field label="Öğretmen / koç">
                <select value={draft.participantId} onChange={(e) => setDraft({ ...draft, participantId: e.target.value })} className={inputCls}>
                  <option value="">Kişi seçin…</option>
                  {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.role === 'koc' ? 'Koç' : 'Öğretmen'}</option>)}
                </select>
                <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Seçilen kişiye bildirim gider; görüşme onun ajandasında da görünür.</p>
              </Field>
            )}
            {draft.kind === 'diger' && (
              <Field label="Kiminle (ör. veli, kurum yetkilisi)">
                <input value={draft.otherName} onChange={(e) => setDraft({ ...draft, otherName: e.target.value })} className={inputCls} placeholder="Ad soyad" />
              </Field>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Field label="Tarih"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inputCls} /></Field>
              <Field label="Saat"><input type="time" step={300} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className={inputCls} /></Field>
              <Field label="Süre">
                <select value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} className={inputCls}>
                  {(DURATIONS.includes(draft.duration) ? DURATIONS : [...DURATIONS, draft.duration].sort((a, b) => a - b)).map((m) => <option key={m} value={m}>{m} dk</option>)}
                </select>
              </Field>
            </div>
            <Field label="Konu"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="ör. Haftalık değerlendirme" /></Field>
            <Field label="Yer / bağlantı"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inputCls} placeholder="ör. Ofis, Zoom linki" /></Field>
            <Field label="Not (yalnızca siz ve katılımcı görür)"><textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={2} className={inputCls} /></Field>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">{error}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onClick={save} disabled={busy}
                className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {busy ? 'Kaydediliyor…' : draft.id ? 'Kaydet' : 'Planla'}
              </button>
              <button type="button" onClick={() => setDraft(null)} disabled={busy} className="rounded-lg px-3 py-2 text-[13px] text-[var(--ink-muted)] hover:bg-[var(--paper)]">Vazgeç</button>
              {draft.id && (
                <button type="button" onClick={cancel} disabled={busy}
                  className="ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50">
                  <IconTrash size={14} /> Görüşmeyi iptal et
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Başkasının planladığı görüşme: salt okunur */}
      {viewing && (
        <Modal title={viewing.title || 'Planlı görüşme'} onClose={() => setViewing(null)}>
          <div className="space-y-2 text-[13px] text-[var(--ink)]">
            <p className="flex items-center gap-2"><IconUser size={15} className="text-teal-600" /> Planlayan: <b>{staffName.get(viewing.owner_id) ?? 'Koç'}</b></p>
            <p className="flex items-center gap-2"><IconClock size={15} className="text-teal-600" />
              {new Date(viewing.starts_at).toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · {viewing.duration_minutes} dk
            </p>
            {viewing.location && <p className="flex items-center gap-2"><IconMapPin size={15} className="text-teal-600" /> {viewing.location}</p>}
            {viewing.note && <p className="flex items-start gap-2"><IconNotes size={15} className="mt-0.5 text-teal-600" /> {viewing.note}</p>}
            {viewing.student_id && studentName.get(viewing.student_id) && (
              <Link href={`/ogrenciler/${viewing.student_id}`} className="inline-block text-[12.5px] font-medium text-teal-700 hover:underline">Öğrenci: {studentName.get(viewing.student_id)}</Link>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-teal-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[var(--ink-muted)]">{label}</span>
      {children}
    </label>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-1.5 text-[var(--ink-muted)]"><span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />{label}</span>;
}

function HourGutter({ hours }: { hours: number[] }) {
  return (
    <div>
      {hours.map((h) => (
        <div key={h} className="relative border-t border-transparent pr-1.5 text-right text-[11px] text-[var(--ink-muted)]" style={{ height: HOUR_PX }}>
          <span className="relative -top-2">{pad(h)}:00</span>
        </div>
      ))}
    </div>
  );
}

/** Bugünün sütununda şu anki saati gösteren çizgi */
function NowLine() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // sunucu ve tarayıcı çıktısı aynı kalsın diye saat ilk boyamadan sonra okunur
    const t = setInterval(tick, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);
  if (!now) return null;
  const top = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_PX;
  if (top < 0 || top > (END_HOUR - START_HOUR) * HOUR_PX) return null;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top }}>
      <div className="relative h-0.5 bg-rose-500"><span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" /></div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[var(--card)] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-white">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/20" aria-label="Kapat"><IconX size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
