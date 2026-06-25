import Link from 'next/link';
import type { Student } from '@/types/database';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
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
  YKS_SAY: 'YKS · SAY',
  YKS_SOZ: 'YKS · SÖZ',
  YKS_EA: 'YKS · EA',
  YKS_DIL: 'YKS · DİL',
  LGS: 'LGS',
  DIGER: 'Diğer',
};

interface StudentStatusCardProps {
  students: (Student & { last_activity?: string })[];
}

export function StudentStatusCard({ students }: StudentStatusCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Öğrenci durumu</h2>
        <Link href="/ogrenciler" className="text-xs text-blue-600 hover:underline">
          Tümünü gör →
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Henüz öğrenci eklenmemiş.{' '}
          <Link href="/ogrenciler/yeni" className="text-blue-600 hover:underline">
            Ekle
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {students.map((s) => {
            const initials = s.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            const avatarClass = AVATAR_COLORS[s.avatar_color] ?? AVATAR_COLORS['av-blue'];
            const status = STATUS_LABELS[s.status] ?? STATUS_LABELS['aktif'];

            return (
              <div key={s.id} className="flex items-center gap-2.5 py-2.5">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${avatarClass}`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/ogrenciler/${s.id}`}
                    className="block text-[13px] font-medium text-gray-900 hover:underline"
                  >
                    {s.full_name}
                  </Link>
                  <div className="text-[12px] text-gray-500">
                    {TRACK_LABELS[s.track] ?? s.track}
                    {s.last_activity ? ` · ${s.last_activity}` : ''}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
