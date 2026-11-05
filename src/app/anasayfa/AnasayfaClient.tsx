'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconPlus, IconNotes, IconChartBar, IconZzz, IconMessageOff, IconFileAlert,
  IconSearch, IconArrowUpRight, IconArrowDownRight, IconChevronRight, IconBell, IconCheck,
  IconCalendarWeek, IconClipboardText, IconSparkles,
} from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { CoachFeedCard } from '@/components/feed/CoachFeedCard';
import { avatarColor, initials, trackPill } from '@/lib/ui-colors';

export type DashStudent = {
  id: string;
  full_name: string;
  track: string | null; kurum: string | null; donem: string | null; sinif_sube: string | null;
  program: { total: number; done: number } | null;
  questions7: number;
  inactiveDays: number | null;
  lastExam: { name: string; type: string; date: string; net: number; delta: number | null } | null;
  lastMeetingDays: number | null;
  metThisWeek: boolean;
};
export type DashMeeting = { id: string; studentId: string; studentName: string; student: any; at: string; type: 'veli' | 'ogrenci'; topic: string | null };
export type DashExam = { id: string; studentId: string; studentName: string; student: any; name: string; date: string; net: number };

type Filter = 'tumu' | 'dikkat' | 'program' | 'calismiyor' | 'gorusme';

const INACTIVE_LIMIT = 3; // bu kadar gündür kayıt yoksa "çalışmıyor" sayılır

const fmtNet = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const isInactive = (s: DashStudent) => s.inactiveDays === null || s.inactiveDays >= INACTIVE_LIMIT;
const needsAttention = (s: DashStudent) => !s.program || isInactive(s) || !s.metThisWeek;

/** Dikkat puanı: büyük olan üstte. Programı olmayan ve uzun süredir çalışmayan öğrenci en önce görünür. */
function attention(s: DashStudent) {
  let score = 0;
  if (!s.program) score += 4;
  if (isInactive(s)) score += 3 + Math.min(s.inactiveDays ?? 14, 14) / 7;
  if (!s.metThisWeek) score += 2;
  if (s.program && s.program.total > 0) score += (1 - s.program.done / s.program.total) * 2;
  return score;
}

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar'}, ${name} 👋`;
}

function relDay(days: number | null, empty: string) {
  if (days === null) return empty;
  if (days <= 0) return 'Bugün';
  if (days === 1) return 'Dün';
  return `${days} gün önce`;
}

// Dikkat kartlarının renk temaları
const THEMES = {
  indigo: { card: 'from-indigo-50 to-white border-indigo-100', chip: 'bg-indigo-500', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  amber: { card: 'from-amber-50 to-white border-amber-100', chip: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-400' },
  rose: { card: 'from-rose-50 to-white border-rose-100', chip: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-400' },
  violet: { card: 'from-violet-50 to-white border-violet-100', chip: 'bg-violet-500', text: 'text-violet-700', ring: 'ring-violet-400' },
} as const;

export function AnasayfaClient({ firstName, today, students, weekMeetings, pendingExams, planRequests, registrations, isAdmin }: {
  firstName: string;
  today: string;
  students: DashStudent[];
  weekMeetings: DashMeeting[];
  pendingExams: DashExam[];
  planRequests: number;
  registrations: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { matchesFilter } = useExamFilter();
  const [filter, setFilter] = useState<Filter>('dikkat');
  const [q, setQ] = useState('');

  const visible = useMemo(() => students.filter(matchesFilter), [students, matchesFilter]);
  const meetings = useMemo(() => weekMeetings.filter((m) => matchesFilter(m.student)), [weekMeetings, matchesFilter]);
  const exams = useMemo(() => pendingExams.filter((e) => matchesFilter(e.student)), [pendingExams, matchesFilter]);

  const counts = {
    program: visible.filter((s) => !s.program).length,
    calismiyor: visible.filter(isInactive).length,
    gorusme: visible.filter((s) => !s.metThisWeek).length,
  };
  const attentionCount = visible.filter(needsAttention).length;
  const okCount = visible.length - attentionCount;
  const questionsWeek = visible.reduce((sum, s) => sum + s.questions7, 0);
  const todayMeetings = meetings.filter((m) => new Date(m.at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === today).length;

  const rows = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr');
    return visible
      .filter((s) => !term || s.full_name.toLocaleLowerCase('tr').includes(term))
      .filter((s) => {
        if (filter === 'dikkat') return needsAttention(s);
        if (filter === 'program') return !s.program;
        if (filter === 'calismiyor') return isInactive(s);
        if (filter === 'gorusme') return !s.metThisWeek;
        return true;
      })
      .sort((a, b) => attention(b) - attention(a) || a.full_name.localeCompare(b.full_name, 'tr'));
  }, [visible, filter, q]);

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const toggle = (f: Filter) => setFilter(filter === f ? 'dikkat' : f);

  return (
    <div className="mx-auto w-full max-w-7xl px-1">
      {/* Karşılama kartı */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-32 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] capitalize text-white/80">{dateLabel}</p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{greeting(firstName)}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{visible.length} aktif öğrenci</span>
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">✅ {okCount} öğrenci yolunda</span>
              {attentionCount > 0 && <span className="rounded-full bg-white px-3 py-1 font-medium text-rose-600">⚠️ {attentionCount} öğrenci dikkat bekliyor</span>}
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">📝 7 günde {questionsWeek.toLocaleString('tr-TR')} soru</span>
              {todayMeetings > 0 && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">📅 Bugün {todayMeetings} görüşme</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/gorusmeler/yeni" className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-medium text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
              <IconNotes size={15} /> Görüşme ekle
            </Link>
            <Link href="/denemeler/yeni" className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-medium text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
              <IconChartBar size={15} /> Deneme gir
            </Link>
            <Link href="/ogrenciler/yeni" className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-violet-700 shadow-sm hover:bg-violet-50">
              <IconPlus size={15} strokeWidth={2.5} /> Yeni öğrenci
            </Link>
          </div>
        </div>
      </div>

      {/* Onay bekleyen işler */}
      {(planRequests > 0 || registrations > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {planRequests > 0 && (
            <Link href="/haftalik-takip" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 hover:bg-amber-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-white"><IconBell size={15} /></span>
              <b>{planRequests}</b> program talebi onayınızı bekliyor <IconChevronRight size={14} />
            </Link>
          )}
          {registrations > 0 && (
            <Link href="/ogrenciler" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 hover:bg-amber-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-white"><IconBell size={15} /></span>
              <b>{registrations}</b> öğrenci başvurusu onayınızı bekliyor <IconChevronRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Öğrencilerin ana sayfasına içerik, pano duyurusu, öneriler */}
      <CoachFeedCard isAdmin={isAdmin} inactive={counts.calismiyor} pendingExams={exams.length} total={visible.length} today={today} />

      {/* Dikkat kartları: tıklayınca aşağıdaki listeyi filtreler */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AlertCard theme="amber" active={filter === 'calismiyor'} onClick={() => toggle('calismiyor')}
          icon={IconZzz} count={counts.calismiyor} label={`${INACTIVE_LIMIT}+ gündür kayıt yok`} hint="Görev işaretlemeyen, çalışma girmeyen" />
        <AlertCard theme="rose" active={filter === 'gorusme'} onClick={() => toggle('gorusme')}
          icon={IconMessageOff} count={counts.gorusme} label="Bu hafta görüşülmedi" hint="Öğrenci görüşmesi (veli hariç)" />
        <AlertCard theme="violet" href="/denemeler" icon={IconFileAlert} count={exams.length} label="Analiz bekleyen deneme" hint="Son 30 gün" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        {/* Öğrenci listesi */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-gradient-to-r from-sky-50 to-white px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white"><IconClipboardText size={17} /></span>
            <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Öğrencilerim · bu hafta</h2>
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara"
                className="w-44 rounded-lg border border-[var(--border)] bg-white py-1.5 pl-7 pr-2 text-[13px] outline-none focus:border-sky-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {([
              ['dikkat', `⚠️ Dikkat isteyen (${attentionCount})`, 'bg-rose-500 text-white', 'bg-rose-50 text-rose-700 hover:bg-rose-100'],
              ['tumu', `Tümü (${visible.length})`, 'bg-slate-700 text-white', 'bg-slate-100 text-slate-700 hover:bg-slate-200'],
              ['program', 'Programı yok', 'bg-indigo-500 text-white', 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'],
              ['calismiyor', 'Çalışmıyor', 'bg-amber-500 text-white', 'bg-amber-50 text-amber-700 hover:bg-amber-100'],
              ['gorusme', 'Görüşülmedi', 'bg-rose-500 text-white', 'bg-rose-50 text-rose-700 hover:bg-rose-100'],
            ] as [Filter, string, string, string][]).map(([key, label, on, off]) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${filter === key ? on : off}`}>
                {label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><IconSparkles size={24} /></div>
              <p className="text-[14px] font-medium text-[var(--ink)]">{filter === 'dikkat' ? 'Bu hafta herkes yolunda görünüyor 🎉' : 'Bu filtrede öğrenci yok.'}</p>
            </div>
          ) : (
            <>
            {/* Telefon: her öğrenci bir kart */}
            <ul className="space-y-2 p-3 md:hidden">
              {rows.map((s) => {
                const tp = trackPill(s.track);
                return (
                  <li key={s.id}>
                    <Link href={`/ogrenciler/${s.id}`} className="block rounded-xl border border-[var(--border)] p-3 active:bg-sky-50">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${avatarColor(s.id)}`}>{initials(s.full_name)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-medium text-[var(--ink)]">{s.full_name}</div>
                          <div className="mt-0.5 flex items-center gap-1">
                            {tp && <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
                            {s.sinif_sube && <span className="text-[11px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
                          </div>
                        </div>
                        {s.questions7 > 0 && <span className="text-right text-[11px] text-[var(--ink-muted)]"><b className="block text-[14px] text-sky-700">{s.questions7.toLocaleString('tr-TR')}</b>soru/7 gün</span>}
                      </div>
                      <div className="mt-2.5">
                        {s.program
                          ? <ProgressBar done={s.program.done} total={s.program.total} />
                          : <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-1 text-[11.5px] font-semibold text-white"><IconPlus size={12} strokeWidth={3} /> Bu hafta programı yok</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        <ActivityPill days={s.inactiveDays} />
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${s.metThisWeek ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {s.metThisWeek && <IconCheck size={12} strokeWidth={3} />}Görüşme: {relDay(s.lastMeetingDays, 'yok')}
                        </span>
                        {s.lastExam && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
                            {s.lastExam.type} {fmtNet(s.lastExam.net)}
                            {s.lastExam.delta !== null && s.lastExam.delta !== 0 && <> {s.lastExam.delta > 0 ? '▲' : '▼'}{fmtNet(Math.abs(s.lastExam.delta))}</>}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto p-2 md:block">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-2 py-2 font-semibold">Öğrenci</th>
                    <th className="px-2 py-2 font-semibold">Program</th>
                    <th className="px-2 py-2 text-right font-semibold">Soru (7 gün)</th>
                    <th className="px-2 py-2 font-semibold">Son çalışma</th>
                    <th className="px-2 py-2 font-semibold">Son deneme</th>
                    <th className="px-2 py-2 font-semibold">Son görüşme</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const tp = trackPill(s.track);
                    return (
                      <tr key={s.id} onClick={() => router.push(`/ogrenciler/${s.id}`)}
                        className="cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-sky-50/60">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${avatarColor(s.id)}`}>
                              {initials(s.full_name)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--ink)]">{s.full_name}</div>
                              <div className="mt-0.5 flex items-center gap-1">
                                {tp && <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
                                {s.sinif_sube && <span className="text-[11px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          {s.program ? (
                            <Link href={`/haftalik-takip?ogrenci=${s.id}`} onClick={(e) => e.stopPropagation()} className="block w-32 hover:opacity-80">
                              <ProgressBar done={s.program.done} total={s.program.total} />
                            </Link>
                          ) : (
                            <Link href={`/haftalik-takip?ogrenci=${s.id}`} onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-indigo-600">
                              <IconPlus size={12} strokeWidth={3} /> Program yaz
                            </Link>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {s.questions7 > 0
                            ? <span className="font-semibold tabular-nums text-sky-700">{s.questions7.toLocaleString('tr-TR')}</span>
                            : <span className="text-[var(--ink-muted)]">–</span>}
                        </td>
                        <td className="px-2 py-2.5"><ActivityPill days={s.inactiveDays} /></td>
                        <td className="px-2 py-2.5">
                          {s.lastExam ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold tabular-nums text-[var(--ink)]">{fmtNet(s.lastExam.net)}</span>
                              <span className="text-[11px] text-[var(--ink-muted)]">{s.lastExam.type}</span>
                              {s.lastExam.delta !== null && s.lastExam.delta !== 0 && (
                                <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[11px] font-semibold ${s.lastExam.delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {s.lastExam.delta > 0 ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
                                  {fmtNet(Math.abs(s.lastExam.delta))}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-[var(--ink-muted)]">–</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${s.metThisWeek ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {s.metThisWeek && <IconCheck size={12} strokeWidth={3} />}
                            {relDay(s.lastMeetingDays, 'Hiç yok')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        {/* Sağ sütun */}
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-center gap-2 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-white px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white"><IconCalendarWeek size={17} /></span>
              <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Bu haftaki görüşmeler</h2>
              <Link href="/ajanda" className="text-[12.5px] font-medium text-teal-700 hover:underline">Ajanda</Link>
            </div>
            {meetings.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[var(--ink-muted)]">Bu hafta görüşme kaydı yok.</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto p-2">
                {meetings.map((m) => {
                  const d = new Date(m.at);
                  const isToday = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === today;
                  return (
                    <li key={m.id}>
                      <Link href={`/gorusmeler/${m.studentId}`} className={`flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-teal-50 ${isToday ? 'bg-teal-50 ring-1 ring-teal-200' : ''}`}>
                        <div className={`flex w-12 flex-shrink-0 flex-col items-center rounded-lg py-1 text-center leading-tight ${isToday ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <span className="text-[10.5px] font-semibold uppercase">{isToday ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short', timeZone: 'Europe/Istanbul' })}</span>
                          <span className="text-[12px] font-semibold tabular-nums">{d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[var(--ink)]">{m.studentName}</div>
                          {m.topic && <div className="truncate text-[11.5px] text-[var(--ink-muted)]">{m.topic}</div>}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${m.type === 'veli' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-sky-100 text-sky-700'}`}>
                          {m.type === 'veli' ? 'Veli' : 'Öğrenci'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-center gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white"><IconChartBar size={17} /></span>
              <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Analiz bekleyen denemeler</h2>
              <Link href="/denemeler" className="text-[12.5px] font-medium text-violet-700 hover:underline">Tümü</Link>
            </div>
            {exams.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[var(--ink-muted)]">Bekleyen analiz yok 🎉</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
                {exams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/denemeler/${e.id}/duzenle`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-violet-50">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(e.studentId)}`}>
                        {initials(e.studentName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[var(--ink)]">{e.studentName}</div>
                        <div className="truncate text-[11.5px] text-[var(--ink-muted)]">
                          {e.name} · {new Date(`${e.date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[12.5px] font-semibold tabular-nums text-violet-700">{fmtNet(e.net)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ theme, icon: Icon, count, label, hint, active, onClick, href }: {
  theme: keyof typeof THEMES; icon: any; count: number; label: string; hint: string; active?: boolean; onClick?: () => void; href?: string;
}) {
  const ok = count === 0;
  const t = THEMES[theme];
  const cls = `flex w-full items-start gap-3 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
    ok ? 'border-emerald-100 from-emerald-50 to-white' : t.card
  } ${active ? `ring-2 ${t.ring}` : ''}`;
  const body = (
    <>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${ok ? 'bg-emerald-500' : t.chip}`}>
        {ok ? <IconCheck size={20} strokeWidth={2.5} /> : <Icon size={20} />}
      </span>
      <span className="min-w-0">
        <span className={`block text-[26px] font-bold leading-none tabular-nums ${ok ? 'text-emerald-700' : t.text}`}>{count}</span>
        <span className="mt-1.5 block text-[12.5px] font-semibold text-[var(--ink)]">{label}</span>
        <span className="block text-[11.5px] text-[var(--ink-muted)]">{ok ? 'Hepsi tamam 🎉' : hint}</span>
      </span>
    </>
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function ActivityPill({ days }: { days: number | null }) {
  const label = relDay(days, 'Kayıt yok');
  const cls = days === null || days >= INACTIVE_LIMIT
    ? 'bg-rose-100 text-rose-700'
    : days <= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-medium ${cls}`}>{label}</span>;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const color = pct >= 70 ? 'from-emerald-400 to-emerald-500' : pct >= 35 ? 'from-sky-400 to-indigo-500' : 'from-amber-400 to-rose-500';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-[var(--ink-muted)]">
        <span className="tabular-nums">{done}/{total} görev</span>
        <span className="font-semibold tabular-nums text-[var(--ink)]">%{pct}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
