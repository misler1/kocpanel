'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { IconEdit, IconTrash, IconX } from '@tabler/icons-react';

export function MeetingDetailModal({
  meeting,
  studentName,
  studentHref,
  onClose,
  onEdit,
  onDelete,
}: {
  meeting: any;
  studentName?: string;
  studentHref?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dt = new Date(meeting.scheduled_at);
  const dateStr = dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const isVeli = meeting.meeting_type === 'veli';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            {studentName && (
              studentHref ? (
                <Link href={studentHref} className="text-[13px] font-medium text-[var(--accent-dark)] hover:underline">
                  {studentName} →
                </Link>
              ) : (
                <div className="text-[13px] font-medium text-[var(--ink-muted)]">{studentName}</div>
              )
            )}
            <h3 className="mt-0.5 text-base font-semibold text-[var(--ink)]">{dateStr}</h3>
            <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{timeStr} · {meeting.duration_minutes} dk</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--paper)]">
            <IconX size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isVeli ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'}`}>
            {isVeli ? 'Veli görüşmesi' : 'Öğrenci görüşmesi'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meeting.completed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'}`}>
            {meeting.completed ? 'Tamamlandı' : 'Bekliyor'}
          </span>
        </div>

        {meeting.topic && (
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Konu</p>
            <p className="text-[14px] text-[var(--ink)]">{meeting.topic}</p>
          </div>
        )}

        {meeting.notes && (
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Notlar</p>
            <p className="whitespace-pre-wrap rounded-lg bg-[var(--paper)] p-3 text-[13px] text-[var(--ink)]">{meeting.notes}</p>
          </div>
        )}

        {meeting.haftalik_takip_getirdi !== null && meeting.haftalik_takip_getirdi !== undefined && (
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Haftalık takip çizelgesi</p>
            <p className={`text-[13px] font-medium ${meeting.haftalik_takip_getirdi ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {meeting.haftalik_takip_getirdi ? 'Getirdi ✓' : 'Getirmedi ✗'}
            </p>
          </div>
        )}

        {!meeting.topic && !meeting.notes && (
          <p className="mb-3 text-[13px] text-[var(--ink-muted)]">Bu görüşme için konu veya not girilmemiş.</p>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink)] hover:bg-[var(--paper)]">
            <IconEdit size={15} /> Düzenle
          </button>
          <button onClick={onDelete} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--danger)]/30 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]">
            <IconTrash size={15} /> Sil
          </button>
        </div>
      </div>
    </div>
  );
}