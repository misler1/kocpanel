'use client';

import { useState, useRef, useEffect } from 'react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { IconChevronDown, IconBuilding, IconCalendar } from '@tabler/icons-react';

export function ExamFilterBar() {
  const {
    examGroup, yksTrack, setExamGroup, setYksTrack, availableGroups,
    kurum, setKurum, availableKurumlar,
    donem, setDonem, availableDonemler,
  } = useExamFilter();

  const yksSubTracks: { value: 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL'; label: string }[] = [
    { value: 'YKS_SAY', label: 'SAY' },
    { value: 'YKS_SOZ', label: 'SÖZ' },
    { value: 'YKS_EA', label: 'EA' },
    { value: 'YKS_DIL', label: 'DİL' },
  ];

  const showExamButtons = availableGroups.length >= 2;

  return (
    <div className="mb-3 space-y-2 border-b border-white/10 pb-3">
      {/* Kurum ve Dönem seçimi */}
      <div className="flex flex-col gap-1.5">
        <Dropdown
          icon={<IconBuilding size={13} />}
          label="Kurum"
          value={kurum}
          allLabel="Tüm kurumlar"
          options={availableKurumlar}
          onChange={setKurum}
        />
        <Dropdown
          icon={<IconCalendar size={13} />}
          label="Dönem"
          value={donem}
          allLabel="Tüm dönemler"
          options={availableDonemler}
          onChange={setDonem}
        />
      </div>

      {/* LGS / YKS filtresi */}
      {showExamButtons && (
        <div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setExamGroup(examGroup === 'LGS' ? null : 'LGS')}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                examGroup === 'LGS'
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              LGS
            </button>
            <button
              onClick={() => setExamGroup(examGroup === 'YKS' ? null : 'YKS')}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                examGroup === 'YKS'
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              YKS
            </button>
          </div>

          {examGroup === 'YKS' && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {yksSubTracks.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setYksTrack(yksTrack === t.value ? null : t.value)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    yksTrack === t.value
                      ? 'border-[var(--accent)]/40 bg-[var(--accent)]/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Küçük dropdown bileşeni ───────────────────────────────────

function Dropdown({
  icon, label, value, allLabel, options, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  allLabel: string;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10"
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon}
          <span className="truncate">{value ?? allLabel}</span>
        </span>
        <IconChevronDown size={12} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-full min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          <div className="mb-0.5 px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]">{label}</div>
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[var(--paper)] ${!value ? 'font-medium text-[var(--accent-dark)]' : 'text-[var(--ink)]'}`}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[var(--paper)] ${value === opt ? 'font-medium text-[var(--accent-dark)]' : 'text-[var(--ink)]'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}