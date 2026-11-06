'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { createClient } from '@/lib/supabase/client';
import { IconCalendar, IconNotes, IconAlertCircle, IconCircleCheck, IconArchive, IconClock } from '@tabler/icons-react';
import { MeetingDetailModal } from './MeetingDetailModal';
import { PageHero } from '@/components/ui/PageHero';
import {
  StudentCard, StudentGrid, ListToolbar, SectionTitle, FilterChips, matchesQuery, lateBy, toolbarSelectCls,
} from '@/components/StudentCard';
import { avatarColor, initials } from '@/lib/ui-colors';
import { SuggestInput } from '@/components/SuggestInput';

type SortKey = 'gorusme_eski' | 'gorusme_yeni' | 'ad' | 'soyad' | 'sinif' | 'dogum';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'gorusme_eski', label: 'Görüşmesi en eski olan önce' },
  { value: 'gorusme_yeni', label: 'Görüşmesi en yeni olan önce' },
  { value: 'ad', label: 'Ada göre (A-Z)' },
  { value: 'soyad', label: 'Soyada göre (A-Z)' },
  { value: 'sinif', label: 'Sınıfa göre' },
  { value: 'dogum', label: 'Doğum tarihine göre' },
];

function getSoyad(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

// Bu haftanın Pazartesi 00:00'ını döndürür
function getThisWeekStart(): Date {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Pazartesi
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}
function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GorusmelerOgrenciListClient({ students }: { students: any[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { matchesFilter } = useExamFilter();
  const [sinifFilter, setSinifFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gorusme_eski');
  const [viewMode, setViewMode] = useState<'ogrenciler' | 'tumu'>('ogrenciler');
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<'tumu' | 'hafta' | 'iki_hafta'>('tumu');

  // ── "Tüm görüşmeler" görünümü için state ──
  const [allMeetings, setAllMeetings] = useState<any[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [meetingSortKey, setMeetingSortKey] = useState<'tarih_yeni' | 'tarih_eski' | 'ogrenci_ad'>('tarih_yeni');
  const [meetingSinifFilter, setMeetingSinifFilter] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);

  const studentsById = useMemo(() => new Map(students.map((s: any) => [s.id, s])), [students]);

  useEffect(() => {
    if (viewMode !== 'tumu' || allMeetings !== null) return;
    async function loadAllMeetings() {
      setLoadingAll(true);
      const studentIds = students.map((s: any) => s.id).filter(Boolean);
      if (studentIds.length === 0) {
        setAllMeetings([]);
        setTopicOptions([]);
        setLoadingAll(false);
        return;
      }

      const { data } = await (supabase as any)
        .from('meetings')
        .select('*, students(id, full_name, sinif_sube, track, kurum, donem), created_by_profile:created_by(id, full_name)')
        .in('student_id', studentIds)
        .order('scheduled_at', { ascending: false });
      setAllMeetings(data ?? []);

      const uniqueTopics = Array.from(
        new Set((data ?? []).map((m: any) => m.topic).filter(Boolean))
      ) as string[];
      setTopicOptions(uniqueTopics);

      setLoadingAll(false);
    }
    loadAllMeetings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, students, supabase]);

  const examFiltered = useMemo(
    () => students.filter((s) => matchesFilter(s)),
    [students, matchesFilter]
  );

  const availableSiniflar = useMemo(() => {
    const set = new Set<string>();
    examFiltered.forEach((s: any) => {
      if (s.sinif_sube && s.sinif_sube.trim()) set.add(s.sinif_sube.trim());
    });
    return Array.from(set).sort();
  }, [examFiltered]);

  const filtered = useMemo(() => {
    let list = examFiltered as any[];
    if (sinifFilter) {
      list = list.filter((s) => s.sinif_sube === sinifFilter);
    }
    if (query) list = list.filter((s) => matchesQuery(s.full_name, query));
    if (quick === 'hafta') list = list.filter((s) => lateBy(s, 7));
    if (quick === 'iki_hafta') list = list.filter((s) => lateBy(s, 14));

    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'ad':
          return a.full_name.localeCompare(b.full_name, 'tr');
        case 'soyad':
          return getSoyad(a.full_name).localeCompare(getSoyad(b.full_name), 'tr');
        case 'sinif':
          return (a.sinif_sube ?? '').localeCompare(b.sinif_sube ?? '', 'tr');
        case 'dogum':
          if (!a.birth_date && !b.birth_date) return 0;
          if (!a.birth_date) return 1;
          if (!b.birth_date) return -1;
          return a.birth_date.localeCompare(b.birth_date);
        case 'gorusme_yeni':
          if (!a.last_meeting_at && !b.last_meeting_at) return 0;
          if (!a.last_meeting_at) return 1;
          if (!b.last_meeting_at) return -1;
          return b.last_meeting_at.localeCompare(a.last_meeting_at);
        case 'gorusme_eski':
          if (!a.last_meeting_at && !b.last_meeting_at) return 0;
          if (!a.last_meeting_at) return -1;
          if (!b.last_meeting_at) return 1;
          return a.last_meeting_at.localeCompare(b.last_meeting_at);
        default:
          return 0;
      }
    });

    return sorted;
  }, [examFiltered, sinifFilter, sortKey, query, quick]);

  const active = filtered.filter((s) => s.status !== 'pasif');
  const passive = filtered.filter((s) => s.status === 'pasif');

  const thisWeekStart = useMemo(() => getThisWeekStart(), []);
  const notMetThisWeek = active.filter((s) => !s.last_meeting_at || new Date(s.last_meeting_at) < thisWeekStart);
  const metThisWeek = active.filter((s) => s.last_meeting_at && new Date(s.last_meeting_at) >= thisWeekStart);

  // ── "Tüm görüşmeler" listesi: filtre + sıralama ──
  const availableMeetingSiniflar = useMemo(() => {
    if (!allMeetings) return [];
    const set = new Set<string>();
    allMeetings.forEach((m: any) => {
      if (matchesFilter(m.students) && m.students?.sinif_sube) set.add(m.students.sinif_sube);
    });
    return Array.from(set).sort();
  }, [allMeetings, matchesFilter]);

  const allMeetingsFilteredSorted = useMemo(() => {
    if (!allMeetings) return [];
    let list = allMeetings.filter((m) => matchesFilter(m.students));
    if (meetingSinifFilter) {
      list = list.filter((m) => m.students?.sinif_sube === meetingSinifFilter);
    }
    if (query) list = list.filter((m) => matchesQuery(m.students?.full_name ?? '', query));

    return [...list].sort((a, b) => {
      switch (meetingSortKey) {
        case 'tarih_yeni':
          return b.scheduled_at.localeCompare(a.scheduled_at);
        case 'tarih_eski':
          return a.scheduled_at.localeCompare(b.scheduled_at);
        case 'ogrenci_ad':
          return (a.students?.full_name ?? '').localeCompare(b.students?.full_name ?? '', 'tr');
        default:
          return 0;
      }
    });
  }, [allMeetings, matchesFilter, meetingSinifFilter, meetingSortKey, query]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    const { data } = await (supabase.from('meetings') as any)
      .update({
        scheduled_at: new Date(editing.scheduled_at_local).toISOString(),
        meeting_type: editing.meeting_type,
        topic: editing.topic?.trim() || null,
        notes: editing.notes?.trim() || null,
        duration_minutes: Number(editing.duration_minutes),
        completed: editing.completed,
      })
      .eq('id', editing.id)
      .select('*, students(id, full_name, sinif_sube, track, kurum, donem), created_by_profile:created_by(id, full_name)')
      .single();

    if (data) setAllMeetings((prev) => (prev ?? []).map((m) => m.id === editing.id ? data : m));
    setSaving(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    await (supabase.from('meetings') as any).delete().eq('id', id);
    setAllMeetings((prev) => (prev ?? []).filter((m) => m.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        theme="teal"
        icon={<IconNotes size={22} />}
        title="Görüşme kayıtları"
        subtitle={<>{viewMode === 'ogrenciler' ? 'Görüşme eklemek/görmek için bir öğrenci seçin' : `${allMeetingsFilteredSorted.length} görüşme`}</>}
        actions={<>
<button
          onClick={() => setViewMode((v) => (v === 'ogrenciler' ? 'tumu' : 'ogrenciler'))}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
        >
          {viewMode === 'ogrenciler' ? <><IconCalendar size={15} /> Tüm görüşmeler</> : <><IconNotes size={15} /> Öğrenciler</>}
        </button>
      </>}
      />

      {viewMode === 'ogrenciler' ? (
        <>
          <ListToolbar query={query} onQuery={setQuery}>
            {availableSiniflar.length > 0 && (
              <select value={sinifFilter} onChange={(e) => setSinifFilter(e.target.value)} className={toolbarSelectCls}>
                <option value="">Tüm sınıflar</option>
                {availableSiniflar.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={toolbarSelectCls}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </ListToolbar>

          {(() => {
            // Sayılar arama ve sınıf filtresine göre; pasif öğrenciler sayılmaz
            const base = (examFiltered as any[]).filter((s) => s.status !== 'pasif'
              && (!sinifFilter || s.sinif_sube === sinifFilter) && matchesQuery(s.full_name, query));
            return (
              <FilterChips
                value={quick}
                onChange={setQuick}
                options={[
                  { value: 'tumu', label: 'Tümü', count: base.length, tone: 'sky' },
                  { value: 'hafta', label: '1 haftadır görüşülmeyen', count: base.filter((s) => lateBy(s, 7)).length, tone: 'amber' },
                  { value: 'iki_hafta', label: '2 haftadır görüşülmeyen', count: base.filter((s) => lateBy(s, 14)).length, tone: 'rose' },
                ]}
              />
            );
          })()}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
              <IconCalendar size={32} className="text-gray-300" />
              <p className="text-[13px] text-[var(--ink-muted)]">Bu filtrede öğrenci yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-7">
              <section>
                <SectionTitle tone="rose" icon={<IconAlertCircle size={18} />} title="Bu hafta görüşülmeyenler" count={notMetThisWeek.length} />
                {notMetThisWeek.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
                    Bu hafta herkesle görüşülmüş 🎉
                  </p>
                ) : (
                  <StudentGrid>
                    {notMetThisWeek.map((s) => <StudentCard key={s.id} student={s} href={`/gorusmeler/${s.id}`} />)}
                  </StudentGrid>
                )}
              </section>

              {metThisWeek.length > 0 && (
                <section>
                  <SectionTitle tone="emerald" icon={<IconCircleCheck size={18} />} title="Bu hafta görüşülenler" count={metThisWeek.length} />
                  <StudentGrid>
                    {metThisWeek.map((s) => <StudentCard key={s.id} student={s} href={`/gorusmeler/${s.id}`} />)}
                  </StudentGrid>
                </section>
              )}

              {passive.length > 0 && (
                <section>
                  <SectionTitle tone="slate" icon={<IconArchive size={18} />} title="Pasif öğrenciler" count={passive.length} />
                  <StudentGrid>
                    {passive.map((s) => <StudentCard key={s.id} student={s} href={`/gorusmeler/${s.id}`} />)}
                  </StudentGrid>
                </section>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <ListToolbar query={query} onQuery={setQuery}>
            {availableMeetingSiniflar.length > 0 && (
              <select value={meetingSinifFilter} onChange={(e) => setMeetingSinifFilter(e.target.value)} className={toolbarSelectCls}>
                <option value="">Tüm sınıflar</option>
                {availableMeetingSiniflar.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <select
              value={meetingSortKey}
              onChange={(e) => setMeetingSortKey(e.target.value as 'tarih_yeni' | 'tarih_eski' | 'ogrenci_ad')}
              className={toolbarSelectCls}
            >
              <option value="tarih_yeni">Tarihe göre (yeniden eskiye)</option>
              <option value="tarih_eski">Tarihe göre (eskiden yeniye)</option>
              <option value="ogrenci_ad">Öğrenci adına göre (A-Z)</option>
            </select>
          </ListToolbar>

          {loadingAll ? (
            <p className="py-10 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor...</p>
          ) : allMeetingsFilteredSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
              <IconCalendar size={32} className="text-[var(--ink-muted)]" />
              <p className="text-[13px] text-[var(--ink-muted)]">Henüz görüşme yok.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {allMeetingsFilteredSorted.map((m) => {
                const dt = new Date(m.scheduled_at);
                const monthShort = dt.toLocaleDateString('tr-TR', { month: 'short' });
                const dayNum = dt.getDate();
                const weekdayStr = dt.toLocaleDateString('tr-TR', { weekday: 'long' });
                const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const isVeli = m.meeting_type === 'veli';
                const studentInfo: any = studentsById.get(m.student_id) ?? m.students;
                const name = studentInfo?.full_name ?? 'Bilinmeyen öğrenci';

                return (
                  <button
                    key={m.id}
                    onClick={() => setViewing(m)}
                    className="group flex items-stretch gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`flex w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b py-2 leading-none text-white ${isVeli ? 'from-violet-400 to-purple-500' : 'from-teal-400 to-emerald-500'}`}>
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/85">{monthShort}</span>
                      <span className="mt-1 text-[20px] font-bold">{dayNum}</span>
                    </div>

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${avatarColor(m.student_id ?? name)}`}>
                          {initials(name)}
                        </span>
                        <span className="truncate text-[14px] font-semibold text-[var(--ink)]">{name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[12px] text-[var(--ink-muted)]">
                        <IconClock size={13} /> {weekdayStr} · {timeStr} · {m.duration_minutes} dk
                      </div>
                      {m.topic && <div className="mt-1 truncate text-[13px] text-[var(--ink)]">{m.topic}</div>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isVeli ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'}`}>
                          {isVeli ? 'Veli görüşmesi' : 'Öğrenci görüşmesi'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {m.completed ? 'Tamamlandı' : 'Bekliyor'}
                        </span>
                        {studentInfo?.is_intern_student && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Stajyer{studentInfo.responsible_coach_other_name ? `: ${studentInfo.responsible_coach_other_name}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {viewing && (
        <MeetingDetailModal
          meeting={viewing}
          studentName={viewing.students?.full_name}
          studentHref={viewing.student_id ? `/gorusmeler/${viewing.student_id}` : undefined}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ ...viewing, scheduled_at_local: toLocalDatetime(viewing.scheduled_at) });
            setViewing(null);
          }}
          onDelete={() => {
            setDeletingId(viewing.id);
            setViewing(null);
          }}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-[var(--ink)]">Görüşmeyi düzenle</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Görüşme türü</label>
                <div className="flex gap-4">
                  {[{ value: 'ogrenci', label: 'Öğrenci' }, { value: 'veli', label: 'Veli' }].map((t) => (
                    <label key={t.value} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" value={t.value} checked={editing.meeting_type === t.value}
                        onChange={() => setEditing({ ...editing, meeting_type: t.value })}
                        className="accent-[var(--accent)]" />
                      <span className="text-sm text-[var(--ink)]">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Tarih & Saat</label>
                <input type="datetime-local" value={editing.scheduled_at_local}
                  onChange={(e) => setEditing({ ...editing, scheduled_at_local: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Süre (dakika)</label>
                <input type="number" min={5} max={180} value={editing.duration_minutes}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Konu</label>
                <SuggestInput
                  options={topicOptions}
                  value={editing.topic ?? ''}
                  onChange={(v) => setEditing({ ...editing, topic: v })}
                  placeholder="Haftalık takip, TYT değerlendirme..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Notlar</label>
                <textarea rows={3} value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Görüşme notları..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={editing.completed}
                  onChange={(e) => setEditing({ ...editing, completed: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]" />
                <span className="text-sm text-[var(--ink)]">Tamamlandı olarak işaretle</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-[var(--ink)]">Görüşmeyi sil?</h3>
            <p className="mb-5 text-sm text-[var(--ink-muted)]">Bu görüşme kalıcı olarak silinecek. Geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                Vazgeç
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-[var(--danger)] py-2 text-sm font-semibold text-white hover:opacity-90">
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
