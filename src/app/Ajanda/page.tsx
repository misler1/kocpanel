/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { IconPlus } from '@tabler/icons-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

function getWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default async function DersProgramiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const weekDays = getWeekDays();
  const weekStart = weekDays[0].toISOString();
  const weekEnd = weekDays[6].toISOString();

  const { data: rawMeetings } = await (supabase as any)
    .from('meetings')
    .select('*, students(full_name, track)')
    .eq('coach_id', user.id)
    .gte('scheduled_at', weekStart)
    .lte('scheduled_at', weekEnd)
    .order('scheduled_at');
  const meetings = (rawMeetings as any[]) ?? [];

  const today = new Date().toDateString();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Ders programı</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">Bu haftaki görüşmeler</p>
        </div>
        <Link
          href="/gorusmeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {weekDays.map((date, i) => {
          const dateStr = date.toDateString();
          const isToday = dateStr === today;
          const dayMeetings = meetings.filter((m: any) => {
            return new Date(m.scheduled_at).toDateString() === dateStr;
          });

          return (
            <div
              key={i}
              className={`min-h-[120px] rounded-xl border p-2 md:p-3 ${
                isToday
                  ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <div className={`mb-1 text-[11px] font-medium ${isToday ? 'text-[var(--accent-dark)]' : 'text-[var(--ink-muted)]'}`}>
                {DAYS[i].slice(0, 3)}
              </div>
              <div className={`mb-2 text-[15px] font-semibold ${isToday ? 'text-[var(--accent-dark)]' : 'text-[var(--ink)]'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayMeetings.map((m: any) => {
                  const time = new Date(m.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                  const isVeli = m.meeting_type === 'veli';
                  return (
                    <div
                      key={m.id}
                      className={`rounded px-1.5 py-1 text-[10px] leading-tight ${
                        isVeli
                          ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                          : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'
                      }`}
                    >
                      <div className="font-medium">{time}</div>
                      <div className="truncate">{m.students?.full_name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3 text-[12px] text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--track-yks)]" /> Koç görüşmesi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" /> Veli görüşmesi
        </span>
      </div>
    </div>
  );
}