import Link from 'next/link';
import type { Exam, Meeting, Student } from '@/types/database';

// ─── SON DENEMELER ──────────────────────────────────────────

interface ExamWithStudent extends Exam {
  students: Pick<Student, 'full_name'> | null;
}

function scoreColor(net: number, max: number) {
  const pct = (net / max) * 100;
  if (pct >= 70) return { fill: 'bg-[#1D9E75]', text: 'text-[#1D9E75]' };
  if (pct >= 45) return { fill: 'bg-[#EF9F27]', text: 'text-[#EF9F27]' };
  return { fill: 'bg-[#E24B4A]', text: 'text-[#E24B4A]' };
}

export function RecentExamsCard({ exams }: { exams: ExamWithStudent[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Son denemeler</h2>
        <Link href="/denemeler" className="text-xs text-blue-600 hover:underline">
          Tümünü gör →
        </Link>
      </div>

      {exams.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Henüz deneme eklenmemiş.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {exams.map((e) => {
            const colors = scoreColor(e.net_score, e.max_score);
            const pct = Math.round((e.net_score / e.max_score) * 100);
            const date = new Date(e.exam_date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-900">
                    {e.students?.full_name} — {e.exam_name}
                  </div>
                  <div className="text-[12px] text-gray-500">
                    {date} · Analiz: {e.analysis_done ? '✓' : '✗'}
                  </div>
                </div>
                <div className="w-20 flex-shrink-0">
                  <div className={`mb-1 text-right text-[12px] ${colors.text}`}>
                    {e.net_score} net
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${colors.fill}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── BU HAFTAKİ GÖRÜŞMELER ──────────────────────────────────

interface MeetingWithStudent extends Meeting {
  students: Pick<Student, 'full_name' | 'track'> | null;
}

const TRACK_SHORT: Record<string, string> = {
  YKS_SAY: 'YKS SAY',
  YKS_SOZ: 'YKS SÖZ',
  YKS_EA: 'YKS EA',
  YKS_DIL: 'YKS DİL',
  LGS: 'LGS',
  DIGER: 'Diğer',
};

export function WeeklyMeetingsCard({ meetings }: { meetings: MeetingWithStudent[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Bu haftaki görüşmeler</h2>
        <Link href="/gorusmeler" className="text-xs text-blue-600 hover:underline">
          Tümünü gör →
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Bu hafta görüşme planlanmamış.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {meetings.map((m) => {
            const dt = new Date(m.scheduled_at);
            const dayStr = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
            const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const isVeli = m.meeting_type === 'veli';
            return (
              <div key={m.id} className="flex items-center gap-2.5 py-2">
                <div
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    isVeli ? 'bg-[#EF9F27]' : 'bg-[#378ADD]'
                  }`}
                />
                <span className="flex-1 text-[13px] text-gray-900">
                  {m.students?.full_name}
                  {isVeli && <span className="ml-1 text-gray-400">(veli)</span>}
                  {' — '}{dayStr} {timeStr}
                </span>
                <span className="flex-shrink-0 text-[11px] text-gray-400">
                  {isVeli ? 'Veli' : TRACK_SHORT[m.students?.track ?? ''] ?? ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
