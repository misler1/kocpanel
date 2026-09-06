'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { IconPlus, IconUsersGroup } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';

export function VeliGorusmeleriClient({ meetings }: { meetings: any[] }) {
  const { matchesFilter } = useExamFilter();
  const filtered = meetings.filter((m) => matchesFilter(m.students));

  const upcoming = filtered.filter((m: any) => new Date(m.scheduled_at) >= new Date());
  const past = filtered.filter((m: any) => new Date(m.scheduled_at) < new Date());

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Veli görüşmeleri</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{filtered.length} veli görüşmesi</p>
        </div>
        <Link
          href="/gorusmeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <IconUsersGroup size={32} className="text-[var(--ink-muted)]" />
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz veli görüşmesi eklenmemiş.</p>
          <Link href="/gorusmeler/yeni" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            Veli görüşmesi ekle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium text-[var(--ink-muted)]">Yaklaşan</h2>
              <VeliList meetings={upcoming} />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium text-[var(--ink-muted)]">Geçmiş</h2>
              <VeliList meetings={past} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function VeliList({ meetings }: { meetings: any[] }) {
  return (
    <div className="flex flex-col gap-2">
      {meetings.map((m: any) => {
        const dt = new Date(m.scheduled_at);
        const monthShort = dt.toLocaleDateString('tr-TR', { month: 'short' });
        const dayNum = dt.getDate();
        const weekdayStr = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
        const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          >
            {/* Tarih bloğu */}
            <div className="flex w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--paper)] py-1.5 leading-none">
              <span className="text-[10px] font-medium text-[var(--ink-muted)]">{monthShort}</span>
              <span className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{dayNum}</span>
            </div>

            {/* İsim + tür + saat */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium text-[var(--ink)]">
                  {m.students?.full_name}
                </span>
                <span className="flex-shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-dark)]">
                  Veli
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                {weekdayStr} · {timeStr} · {m.duration_minutes} dk
              </div>
            </div>

            {/* Konu — ayrı sütun */}
            <div className="hidden w-36 flex-shrink-0 border-l border-[var(--border)] pl-4 md:block">
              {m.topic ? (
                <span className="line-clamp-2 text-[12.5px] text-[var(--ink)]">{m.topic}</span>
              ) : (
                <span className="text-[12.5px] text-[var(--ink-muted)]">Konu yok</span>
              )}
            </div>

            {/* Durum */}
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                m.completed
                  ? 'bg-[var(--success-soft)] text-[var(--success)]'
                  : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
              }`}
            >
              {m.completed ? 'Tamamlandı' : 'Bekliyor'}
            </span>
          </div>
        );
      })}
    </div>
  );
}