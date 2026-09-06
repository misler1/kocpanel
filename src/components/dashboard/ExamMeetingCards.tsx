import Link from 'next/link';
import type { Exam, Meeting, Student } from '@/types/database';

// ─── SON DENEMELER ──────────────────────────────────────────

interface ExamWithStudent extends Exam {
  students: Pick<Student, 'full_name'> | null;
}

function scoreColor(net: number, max: number) {
  const pct = (net / max) * 100;
  if (pct >= 70) return { fill: 'bg-[var(--success)]', text: 'text-[var(--success)]' };
  if (pct >= 45) return { fill: 'bg-[var(--accent)]', text: 'text-[var(--accent-dark)]' };
  return { fill: 'bg-[var(--danger)]', text: 'text-[var(--danger)]' };
}

export function RecentExamsCard({ exams }: { exams: ExamWithStudent[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--ink)]">Son denemeler</h2>
        <Link href="/denemeler" className="text-[12.5px] font-medium text-[var(--accent-dark)] hover:underline">
          Tümünü gör →
        </Link>
      </div>

      {exams.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--ink-muted)]">Henüz deneme eklenmemiş.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
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
                  <div className="text-[13px] font-medium text-[var(--ink)]">
                    {e.students?.full_name} — {e.exam_name}
                  </div>
                  <div className="text-[12px] text-[var(--ink-muted)]">
                    {date} · Analiz: {e.analysis_done ? '✓' : '✗'}
                  </div>
                </div>
                <div className="w-20 flex-shrink-0">
                  <div className={`mb-1 text-right text-[12px] font-medium ${colors.text}`}>
                    {e.net_score} net
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--paper)]">
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

function trackTone(track?: string) {
  if (!track) return 'text-[var(--ink-muted)]';
  if (track.startsWith('YKS')) return 'text-[var(--track-yks)]';
  if (track === 'LGS') return 'text-[var(--track-lgs)]';
  return 'text-[var(--ink-muted)]';
}

export function WeeklyMeetingsCard({ meetings }: { meetings: MeetingWithStudent[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--ink)]">Bu haftaki görüşmeler</h2>
        <Link href="/gorusmeler" className="text-[12.5px] font-medium text-[var(--accent-dark)] hover:underline">
          Tümünü gör →
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--ink-muted)]">Bu hafta görüşme planlanmamış.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {meetings.map((m) => {
            const dt = new Date(m.scheduled_at);
            const dayStr = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
            const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const isVeli = m.meeting_type === 'veli';
            return (
              <div key={m.id} className="flex items-center gap-2.5 py-2">
                <div
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    isVeli ? 'bg-[var(--accent)]' : 'bg-[var(--track-yks)]'
                  }`}
                />
                <span className="flex-1 text-[13px] text-[var(--ink)]">
                  {m.students?.full_name}
                  {isVeli && <span className="ml-1 text-[var(--ink-muted)]">(veli)</span>}
                  {' — '}{dayStr} {timeStr}
                </span>
                <span className={`flex-shrink-0 text-[11px] font-medium ${isVeli ? 'text-[var(--accent-dark)]' : trackTone(m.students?.track)}`}>
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