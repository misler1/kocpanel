'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import { createClient } from '@/lib/supabase/client';
import { IconChevronRight, IconCalendar } from '@tabler/icons-react';
import { MeetingDetailModal } from './MeetingDetailModal';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aktif: { label: 'Aktif', className: 'bg-[var(--success-soft)] text-[var(--success)]' },
  gorusme_bekliyor: { label: 'Görüşme yok', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  analiz_eksik: { label: 'Analiz yok', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  dikkat: { label: 'Dikkat', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  pasif: { label: 'Pasif', className: 'bg-[var(--paper)] text-[var(--ink-muted)]' },
};

const AVATAR_COLORS: Record<string, string> = {
  'av-blue': 'bg-[#E6F1FB] text-[#185FA5]',
  'av-teal': 'bg-[#E1F5EE] text-[#0F6E56]',
  'av-purple': 'bg-[#EEEDFE] text-[#534AB7]',
  'av-amber': 'bg-[#FAEEDA] text-[#854F0B]',
  'av-coral': 'bg-[#FAECE7] text-[#993C1D]',
};

const TRACK_LABELS: Record<string, string> = {
  YKS_SAY: 'YKS · SAY', YKS_SOZ: 'YKS · SÖZ', YKS_EA: 'YKS · EA',
  YKS_DIL: 'YKS · DİL', LGS: 'LGS', DIGER: 'Diğer',
};

type SortKey = 'gorusme_eski' | 'gorusme_yeni' | 'ad' | 'soyad' | 'sinif' | 'dogum';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'gorusme_eski', label: 'Görüşmesi en eski olan önce' },
  { value: 'gorusme_yeni', label: 'Görüşmesi en yeni olan önce' },
  { value: 'ad', label: 'Ada göre (A-Z)' },
  { value: 'soyad', label: 'Soyada göre (A-Z)' },
  { value: 'sinif', label: 'Sınıfa göre' },
  { value: 'dogum', label: 'Doğum tarihine göre' },
];

function trackColor(track: string) {
  if (track.startsWith('YKS')) return 'text-[var(--track-yks)]';
  if (track === 'LGS') return 'text-[var(--track-lgs)]';
  return 'text-[var(--ink-muted)]';
}

function getSoyad(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GorusmelerOgrenciListClient({ students }: { students: any[] }) {
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [sinifFilter, setSinifFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gorusme_eski');
  const [viewMode, setViewMode] = useState<'ogrenciler' | 'tumu'>('ogrenciler');

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

  useEffect(() => {
    if (viewMode !== 'tumu' || allMeetings !== null) return;
    async function loadAllMeetings() {
      setLoadingAll(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingAll(false); return; }

      const { data } = await (supabase as any)
        .from('meetings')
        .select('*, students(id, full_name, sinif_sube, track, kurum, donem)')
        .eq('coach_id', user.id)
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
  }, [viewMode]);

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
  }, [examFiltered, sinifFilter, sortKey]);

  const active = filtered.filter((s) => s.status !== 'pasif');
  const passive = filtered.filter((s) => s.status === 'pasif');

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
  }, [allMeetings, matchesFilter, meetingSinifFilter, meetingSortKey]);

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
      .select('*, students(id, full_name, sinif_sube, track, kurum, donem)')
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Görüşme kayıtları</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            {viewMode === 'ogrenciler' ? 'Görüşme eklemek/görmek için bir öğrenci seçin' : `${allMeetingsFilteredSorted.length} görüşme`}
          </p>
        </div>
        <button
          onClick={() => setViewMode((v) => (v === 'ogrenciler' ? 'tumu' : 'ogrenciler'))}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
        >
          {viewMode === 'ogrenciler' ? 'Tüm görüşmeler' : 'Öğrenciler'}
        </button>
      </div>

      {viewMode === 'ogrenciler' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {availableSiniflar.length > 0 && (
              <select
                value={sinifFilter}
                onChange={(e) => setSinifFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
              >
                <option value="">Tüm sınıflar</option>
                {availableSiniflar.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
              <IconCalendar size={32} className="text-[var(--ink-muted)]" />
              <p className="text-[13px] text-[var(--ink-muted)]">Bu filtrede öğrenci yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {active.map((s) => <StudentRow key={s.id} student={s} />)}
              {passive.length > 0 && (
                <div className="mt-2 mb-1 text-[12px] font-medium text-[var(--ink-muted)]">Pasif öğrenciler</div>
              )}
              {passive.map((s) => <StudentRow key={s.id} student={s} />)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {availableMeetingSiniflar.length > 0 && (
              <select
                value={meetingSinifFilter}
                onChange={(e) => setMeetingSinifFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
              >
                <option value="">Tüm sınıflar</option>
                {availableMeetingSiniflar.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <select
              value={meetingSortKey}
              onChange={(e) => setMeetingSortKey(e.target.value as 'tarih_yeni' | 'tarih_eski' | 'ogrenci_ad')}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
            >
              <option value="tarih_yeni">Tarihe göre (yeniden eskiye)</option>
              <option value="tarih_eski">Tarihe göre (eskiden yeniye)</option>
              <option value="ogrenci_ad">Öğrenci adına göre (A-Z)</option>
            </select>
          </div>

          {loadingAll ? (
            <p className="py-10 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor...</p>
          ) : allMeetingsFilteredSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
              <IconCalendar size={32} className="text-[var(--ink-muted)]" />
              <p className="text-[13px] text-[var(--ink-muted)]">Henüz görüşme yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {allMeetingsFilteredSorted.map((m) => {
                const dt = new Date(m.scheduled_at);
                const monthShort = dt.toLocaleDateString('tr-TR', { month: 'short' });
                const dayNum = dt.getDate();
                const weekdayStr = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
                const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const isVeli = m.meeting_type === 'veli';

                return (
                  <button
                    key={m.id}
                    onClick={() => setViewing(m)}
                    className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--paper)]"
                  >
                    <div className="flex w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--paper)] py-1.5 leading-none">
                      <span className="text-[10px] font-medium text-[var(--ink-muted)]">{monthShort}</span>
                      <span className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{dayNum}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-[var(--ink)]">{m.students?.full_name ?? 'Bilinmeyen öğrenci'}</span>
                        <span
                          className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            isVeli ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'
                          }`}
                        >
                          {isVeli ? 'Veli' : 'Koç'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{weekdayStr} · {timeStr} · {m.duration_minutes} dk</div>
                      {m.topic && <div className="mt-0.5 truncate text-[13px] text-[var(--ink)]">{m.topic}</div>}
                    </div>

                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        m.completed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                      }`}
                    >
                      {m.completed ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
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
                <input type="text"
                  list="konu-onerileri-tumu"
                  value={editing.topic ?? ''}
                  onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  placeholder="Haftalık takip, TYT değerlendirme..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
                <datalist id="konu-onerileri-tumu">
                  {topicOptions.map((t) => <option key={t} value={t} />)}
                </datalist>
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

function StudentRow({ student: s }: { student: any }) {
  const initials = s.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarClass = AVATAR_COLORS[s.avatar_color] ?? AVATAR_COLORS['av-blue'];
  const status = STATUS_MAP[s.status] ?? STATUS_MAP['aktif'];
  const isPasif = s.status === 'pasif';
  const lastMeetingText = s.last_meeting_at
    ? new Date(s.last_meeting_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Henüz görüşme yok';

  return (
    <Link
      href={`/gorusmeler/${s.id}`}
      className={`group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--paper)] ${isPasif ? 'opacity-60' : ''}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${avatarClass}`}>
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[var(--ink)]">{s.full_name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px]">
          <span className={`font-medium ${trackColor(s.track)}`}>{TRACK_LABELS[s.track] ?? s.track}</span>
          {s.sinif_sube && (
            <>
              <span className="text-[var(--border)]">•</span>
              <span className="text-[var(--ink-muted)]">{s.sinif_sube}</span>
            </>
          )}
          <span className="text-[var(--border)]">•</span>
          <span className={s.last_meeting_at ? 'text-[var(--ink-muted)]' : 'text-[var(--danger)]'}>
            Son görüşme: {lastMeetingText}
          </span>
        </div>
      </div>

      <span className={`hidden flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-block ${status.className}`}>
        {status.label}
      </span>

      <IconChevronRight
        size={16}
        className="flex-shrink-0 text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}