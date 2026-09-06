'use client';

import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Student } from '@/types/database';
import { IconChevronRight } from '@tabler/icons-react';

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

function trackColor(track: string) {
  if (track.startsWith('YKS')) return 'text-[var(--track-yks)]';
  if (track === 'LGS') return 'text-[var(--track-lgs)]';
  return 'text-[var(--ink-muted)]';
}

export function OgrencilerClient({ students }: { students: Student[] }) {
  const { matchesFilter } = useExamFilter();

  const filtered = students.filter((s) => matchesFilter(s));
  const active = filtered.filter((s) => s.status !== 'pasif');
  const passive = filtered.filter((s) => s.status === 'pasif');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Öğrenciler</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{active.length} aktif öğrenci</p>
        </div>
        <Link
          href="/ogrenciler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          + Öğrenci ekle
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
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

function StudentRow({ student: s }: { student: Student }) {
  const initials = s.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarClass = AVATAR_COLORS[s.avatar_color] ?? AVATAR_COLORS['av-blue'];
  const status = STATUS_MAP[s.status] ?? STATUS_MAP['aktif'];
  const date = new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  const isPasif = s.status === 'pasif';

  return (
    <Link
      href={`/ogrenciler/${s.id}`}
      className={`group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--paper)] ${isPasif ? 'opacity-60' : ''}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${avatarClass}`}>
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[var(--ink)]">{s.full_name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px]">
          <span className={`font-medium ${trackColor(s.track)}`}>{TRACK_LABELS[s.track] ?? s.track}</span>
          <span className="text-[var(--border)]">•</span>
          <span className="text-[var(--ink-muted)]">Katılım {date}</span>
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