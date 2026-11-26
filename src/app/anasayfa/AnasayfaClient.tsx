'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconPlus, IconNotes, IconChartBar, IconZzz, IconMessageOff, IconFileAlert,
  IconSearch, IconArrowUpRight, IconArrowDownRight, IconChevronRight, IconBell, IconCheck,
  IconCalendarWeek, IconSparkles,
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
  return `${h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar'}, ${name}`;
}

function relDay(days: number | null, empty: string) {
  if (days === null) return empty;
  if (days <= 0) return 'Bugün';
  if (days === 1) return 'Dün';
  return `${days} gün önce`;
}

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

  const card = 'rounded-xl border border-[var(--border)] bg-[var(--card)]';
  const ghostBtn = 'flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--paper)]';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-1">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink)]">{greeting(firstName)}</h1>
          <p className="mt-0.5 text-[13px] capitalize text-[var(--ink-muted)]">
            {dateLabel}{todayMeetings > 0 ? ` · bugün ${todayMeetings} görüşme` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gorusmeler/yeni" className={ghostBtn}><IconNotes size={16} stroke={1.8} /> Görüşme ekle</Link>
          <Link href="/denemeler/yeni" className={ghostBtn}><IconChartBar size={16} stroke={1.8} /> Deneme gir</Link>
          <Link href="/ogrenciler/yeni" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            <IconPlus size={16} strokeWidth={2.4} /> Yeni öğrenci
          </Link>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktif öğrenci" value={visible.length.toLocaleString('tr-TR')} />
        <Stat label="Yolunda" value={okCount.toLocaleString('tr-TR')} sub={visible.length ? `%${Math.round((okCount / visible.length) * 100)} öğrenci` : undefined} tone="ok" />
        <Stat label="Dikkat bekleyen" value={attentionCount.toLocaleString('tr-TR')} sub={attentionCount ? 'Aşağıdaki listede' : 'Herkes yolunda'} tone={attentionCount ? 'warn' : 'ok'} />
        <Stat label="7 günde çözülen soru" value={questionsWeek.toLocaleString('tr-TR')} />
      </div>

      {/* Onay bekleyen işler */}
      {(planRequests > 0 || registrations > 0) && (
        <div className="flex flex-wrap gap-2">
          {planRequests > 0 && (
            <Link href="/haftalik-takip" className={`${card} flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]`}>
              <IconBell size={16} stroke={1.8} className="text-amber-600" />
              <span><b>{planRequests}</b> program talebi onayınızı bekliyor</span> <IconChevronRight size={14} className="text-[var(--ink-muted)]" />
            </Link>
          )}
          {registrations > 0 && (
            <Link href="/ogrenciler" className={`${card} flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]`}>
              <IconBell size={16} stroke={1.8} className="text-amber-600" />
              <span><b>{registrations}</b> öğrenci başvurusu onayınızı bekliyor</span> <IconChevronRight size={14} className="text-[var(--ink-muted)]" />
            </Link>
          )}
        </div>
      )}

      {/* Öğrencilerin ana sayfasına içerik, pano duyurusu, öneriler */}
      <CoachFeedCard isAdmin={isAdmin} inactive={counts.calismiyor} pendingExams={exams.length} total={visible.length} today={today} />

      {/* Dikkat kartları: tıklayınca aşağıdaki listeyi filtreler */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AlertCard tone="warn" active={filter === 'calismiyor'} onClick={() => toggle('calismiyor')}
          icon={IconZzz} count={counts.calismiyor} label={`${INACTIVE_LIMIT}+ gündür kayıt yok`} hint="Görev işaretlemeyen, çalışma girmeyen" />
        <AlertCard tone="risk" active={filter === 'gorusme'} onClick={() => toggle('gorusme')}
          icon={IconMessageOff} count={counts.gorusme} label="Bu hafta görüşülmedi" hint="Öğrenci görüşmesi (veli hariç)" />
        <AlertCard tone="accent" href="/denemeler" icon={IconFileAlert} count={exams.length} label="Analiz bekleyen deneme" hint="Son 30 gün" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        {/* Öğrenci listesi */}
        <section className={`${card} min-w-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-4">
            <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Öğrencilerim · bu hafta</h2>
            <div className="relative">
              <IconSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara"
                className="w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {([
              ['dikkat', `Dikkat isteyen (${attentionCount})`],
              ['tumu', `Tümü (${visible.length})`],
              ['program', 'Programı yok'],
              ['calismiyor', 'Çalışmıyor'],
              ['gorusme', 'Görüşülmedi'],
            ] as [Filter, string][]).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${filter === key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="border-t border-[var(--border)] px-4 py-12 text-center">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><IconSparkles size={22} stroke={1.8} /></div>
              <p className="text-[14px] font-medium text-[var(--ink)]">{filter === 'dikkat' ? 'Bu hafta herkes yolunda görünüyor.' : 'Bu filtrede öğrenci yok.'}</p>
            </div>
          ) : (
            <>
            {/* Telefon: her öğrenci bir kart */}
            <ul className="space-y-2 border-t border-[var(--border)] p-3 md:hidden">
              {rows.map((s) => {
                const tp = trackPill(s.track);
                return (
                  <li key={s.id}>
                    <Link href={`/ogrenciler/${s.id}`} className="block rounded-xl border border-[var(--border)] p-3 active:bg-[var(--paper)]">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${avatarColor(s.id)}`}>{initials(s.full_name)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{s.full_name}</div>
                          <div className="mt-0.5 flex items-center gap-1">
                            {tp && <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
                            {s.sinif_sube && <span className="text-[11.5px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
                          </div>
                        </div>
                        {s.questions7 > 0 && <span className="text-right text-[11px] text-[var(--ink-muted)]"><b className="block text-[14px] text-[var(--ink)]">{s.questions7.toLocaleString('tr-TR')}</b>soru / 7 gün</span>}
                      </div>
                      <div className="mt-2.5">
                        {s.program
                          ? <ProgressBar done={s.program.done} total={s.program.total} />
                          : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--accent-dark)]"><IconPlus size={12} strokeWidth={3} /> Bu hafta programı yok</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        <ActivityPill days={s.inactiveDays} />
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${s.metThisWeek ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>
                          {s.metThisWeek && <IconCheck size={12} strokeWidth={3} />}Görüşme: {relDay(s.lastMeetingDays, 'yok')}
                        </span>
                        {s.lastExam && (
                          <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 font-medium text-[var(--ink)]">
                            {s.lastExam.type} {fmtNet(s.lastExam.net)}
                            {s.lastExam.delta !== null && s.lastExam.delta !== 0 && (
                              <b className={s.lastExam.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}> {s.lastExam.delta > 0 ? '▲' : '▼'}{fmtNet(Math.abs(s.lastExam.delta))}</b>
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="border-y border-[var(--border)] bg-[var(--paper)]/60 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-4 py-2 font-semibold">Öğrenci</th>
                    <th className="px-2 py-2 font-semibold">Program</th>
                    <th className="px-2 py-2 text-right font-semibold">Soru (7 gün)</th>
                    <th className="px-2 py-2 font-semibold">Son çalışma</th>
                    <th className="px-2 py-2 font-semibold">Son deneme</th>
                    <th className="px-2 py-2 pr-4 font-semibold">Son görüşme</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const tp = trackPill(s.track);
                    return (
                      <tr key={s.id} onClick={() => router.push(`/ogrenciler/${s.id}`)}
                        className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--paper)]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${avatarColor(s.id)}`}>
                              {initials(s.full_name)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[var(--ink)]">{s.full_name}</div>
                              <div className="mt-0.5 flex items-center gap-1">
                                {tp && <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
                                {s.sinif_sube && <span className="text-[11.5px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
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
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--accent-dark)] hover:bg-[var(--accent)] hover:text-white">
                              <IconPlus size={12} strokeWidth={3} /> Program yaz
                            </Link>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {s.questions7 > 0
                            ? <span className="font-semibold tabular-nums text-[var(--ink)]">{s.questions7.toLocaleString('tr-TR')}</span>
                            : <span className="text-[var(--ink-muted)]">–</span>}
                        </td>
                        <td className="px-2 py-2.5"><ActivityPill days={s.inactiveDays} /></td>
                        <td className="px-2 py-2.5">
                          {s.lastExam ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold tabular-nums text-[var(--ink)]">{fmtNet(s.lastExam.net)}</span>
                              <span className="text-[11px] text-[var(--ink-muted)]">{s.lastExam.type}</span>
                              {s.lastExam.delta !== null && s.lastExam.delta !== 0 && (
                                <span className={`inline-flex items-center text-[11.5px] font-semibold ${s.lastExam.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {s.lastExam.delta > 0 ? <IconArrowUpRight size={13} /> : <IconArrowDownRight size={13} />}
                                  {fmtNet(Math.abs(s.lastExam.delta))}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-[var(--ink-muted)]">–</span>}
                        </td>
                        <td className="px-2 py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${s.metThisWeek ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>
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
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2 px-4 pb-2 pt-4">
              <IconCalendarWeek size={18} stroke={1.8} className="text-[var(--accent)]" />
              <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Bu haftaki görüşmeler</h2>
              <Link href="/ajanda" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Ajanda</Link>
            </div>
            {meetings.length === 0 ? (
              <p className="px-4 pb-8 pt-4 text-center text-[13px] text-[var(--ink-muted)]">Bu hafta görüşme kaydı yok.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto px-2 pb-2">
                {meetings.map((m) => {
                  const d = new Date(m.at);
                  const isToday = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === today;
                  return (
                    <li key={m.id}>
                      <Link href={`/gorusmeler/${m.studentId}`} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--paper)] ${isToday ? 'bg-[var(--accent-soft)]/60' : ''}`}>
                        <div className="w-12 flex-shrink-0 text-center leading-tight">
                          <span className={`block text-[10.5px] font-semibold uppercase ${isToday ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>{isToday ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short', timeZone: 'Europe/Istanbul' })}</span>
                          <span className="block text-[13px] font-bold tabular-nums text-[var(--ink)]">{d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[var(--ink)]">{m.studentName}</div>
                          {m.topic && <div className="truncate text-[11.5px] text-[var(--ink-muted)]">{m.topic}</div>}
                        </div>
                        <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ink-muted)]">
                          {m.type === 'veli' ? 'Veli' : 'Öğrenci'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2 px-4 pb-2 pt-4">
              <IconChartBar size={18} stroke={1.8} className="text-[var(--accent)]" />
              <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">Analiz bekleyen denemeler</h2>
              <Link href="/denemeler" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Tümü</Link>
            </div>
            {exams.length === 0 ? (
              <p className="px-4 pb-8 pt-4 text-center text-[13px] text-[var(--ink-muted)]">Bekleyen analiz yok.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto px-2 pb-2">
                {exams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/denemeler/${e.id}/duzenle`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--paper)]">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(e.studentId)}`}>
                        {initials(e.studentName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[var(--ink)]">{e.studentName}</div>
                        <div className="truncate text-[11.5px] text-[var(--ink-muted)]">
                          {e.name} · {new Date(`${e.date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums text-[var(--ink)]">{fmtNet(e.net)}</span>
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

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
      <div className="text-[12.5px] font-medium text-[var(--ink-muted)]">{label}</div>
      <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight tabular-nums text-[var(--ink)]">{value}</div>
      {sub && <div className={`mt-1.5 text-[12px] font-medium ${tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-[var(--ink-muted)]'}`}>{sub}</div>}
    </div>
  );
}

const TONES = {
  warn: { dot: 'bg-amber-500', ring: 'ring-amber-400' },
  risk: { dot: 'bg-rose-500', ring: 'ring-rose-400' },
  accent: { dot: 'bg-[var(--accent)]', ring: 'ring-[var(--accent)]' },
} as const;

function AlertCard({ tone, icon: Icon, count, label, hint, active, onClick, href }: {
  tone: keyof typeof TONES; icon: any; count: number; label: string; hint: string; active?: boolean; onClick?: () => void; href?: string;
}) {
  const ok = count === 0;
  const t = TONES[tone];
  const cls = `flex w-full items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:bg-[var(--paper)] ${active ? `ring-2 ${t.ring}` : ''}`;
  const body = (
    <>
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>
        {ok ? <IconCheck size={18} strokeWidth={2.4} /> : <Icon size={18} stroke={1.8} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[24px] font-bold leading-none tabular-nums text-[var(--ink)]">{count}</span>
          {!ok && <span className={`h-2 w-2 rounded-full ${t.dot}`} />}
        </span>
        <span className="mt-1.5 block text-[12.5px] font-semibold text-[var(--ink)]">{label}</span>
        <span className="block text-[11.5px] text-[var(--ink-muted)]">{ok ? 'Hepsi tamam' : hint}</span>
      </span>
    </>
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function ActivityPill({ days }: { days: number | null }) {
  const label = relDay(days, 'Kayıt yok');
  const cls = days === null || days >= INACTIVE_LIMIT
    ? 'bg-rose-50 text-rose-700'
    : days <= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-medium ${cls}`}>{label}</span>;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-[var(--ink-muted)]">
        <span className="tabular-nums">{done}/{total} görev</span>
        <span className="font-semibold tabular-nums text-[var(--ink)]">%{pct}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--paper)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
