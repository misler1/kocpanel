'use client';

import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Student } from '@/types/database';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aktif: { label: 'Aktif', className: 'bg-[#EAF3DE] text-[#3B6D11]' },
  gorusme_bekliyor: { label: 'Görüşme yok', className: 'bg-[#FAEEDA] text-[#854F0B]' },
  analiz_eksik: { label: 'Analiz yok', className: 'bg-[#FCEBEB] text-[#A32D2D]' },
  dikkat: { label: 'Dikkat', className: 'bg-[#FCEBEB] text-[#A32D2D]' },
  pasif: { label: 'Pasif', className: 'bg-gray-100 text-gray-500' },
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

export function OgrencilerClient({ students }: { students: Student[] }) {
  const { examGroup, yksTrack } = useExamFilter();

  // Filtreleme
  const filtered = students.filter((s) => {
    if (!examGroup) return true;
    if (examGroup === 'LGS') return s.track === 'LGS';
    if (examGroup === 'YKS') {
      if (yksTrack) return s.track === yksTrack;
      return s.track.startsWith('YKS');
    }
    return true;
  });

  const active = filtered.filter((s) => s.status !== 'pasif');
  const passive = filtered.filter((s) => s.status === 'pasif');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Öğrenciler</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{active.length} aktif öğrenci</p>
        </div>
        <Link
          href="/ogrenciler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
        >
          + Öğrenci ekle
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-20">
          <p className="text-sm text-gray-400">Bu filtrede öğrenci yok.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[12px] font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Öğrenci</th>
                <th className="hidden px-4 py-3 md:table-cell">Alan</th>
                <th className="px-4 py-3">Durum</th>
                <th className="hidden px-4 py-3 md:table-cell">Eklenme</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.map((s) => <StudentRow key={s.id} student={s} />)}
              {passive.map((s) => <StudentRow key={s.id} student={s} />)}
            </tbody>
          </table>
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

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${avatarClass}`}>
            {initials}
          </div>
          <span className="font-medium text-gray-900">{s.full_name}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{TRACK_LABELS[s.track] ?? s.track}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="hidden px-4 py-3 text-gray-400 md:table-cell">{date}</td>
      <td className="px-4 py-3 text-right">
        <Link href={`/ogrenciler/${s.id}`} className="text-[12px] text-blue-600 hover:underline">
          Detay →
        </Link>
      </td>
    </tr>
  );
}