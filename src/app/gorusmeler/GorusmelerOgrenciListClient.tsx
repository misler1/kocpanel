'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import { IconChevronRight, IconCalendar } from '@tabler/icons-react';

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

export function GorusmelerOgrenciListClient({ students }: { students: any[] }) {
  const { matchesFilter } = useExamFilter();
  const [sinifFilter, setSinifFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gorusme_eski');

  const examFiltered = useMemo(
    () => students.filter((s) => matchesFilter(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students]
  );

  const availableSiniflar = useMemo(() => {
    const set = new Set<string>();
    examFiltered.forEach((s) => {
      if (s.sinif_sube && s.sinif_sube.trim()) set.add(s.sinif_sube.trim());
    });
    return Array.from(set).sort();
  }, [examFiltered]);

  const filtered = useMemo(() => {
    let list = examFiltered;
    if (sinifFilter) list = list.filter((s) => s.sinif_sube === sinifFilter);

    return [...list].sort((a, b) => {
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
  }, [examFiltered, sinifFilter, sortKey]);

  const active = filtered.filter((s) => s.status !== 'pasif');
  const passive = filtered.filter((s) => s.status === 'pasif');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">Görüşme kayıtları</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">Görüşme eklemek/görmek için bir öğrenci seçin</p>
      </div>

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