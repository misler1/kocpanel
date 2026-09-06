'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';

type Group = 'Tümü' | 'LGS' | 'YKS' | 'Ara Sınıf';

// track değerine göre grup belirle
function getGroup(track: string): Exclude<Group, 'Tümü'> {
  if (track === 'LGS') return 'LGS';
  if (track === 'YKS' || track === 'mezun') return 'YKS';
  return 'Ara Sınıf'; // 9, 10, 11. sınıf
}

interface Student {
  id: string;
  full_name: string;
  track: string;
}

interface Props {
  students: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
  showAll?: boolean; // "Tümü" seçeneği gösterilsin mi
}

const GROUP_BUTTONS: Group[] = ['Tümü', 'LGS', 'YKS', 'Ara Sınıf'];

const GROUP_STYLES: Record<Group, { active: string; inactive: string }> = {
  'Tümü':      { active: 'bg-[var(--ink)] text-white',                     inactive: 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]' },
  'LGS':       { active: 'bg-[var(--track-lgs)] text-white',               inactive: 'bg-[var(--track-lgs-soft)] text-[var(--track-lgs)] hover:opacity-80' },
  'YKS':       { active: 'bg-[var(--track-yks)] text-white',               inactive: 'bg-[var(--track-yks-soft)] text-[var(--track-yks)] hover:opacity-80' },
  'Ara Sınıf': { active: 'bg-[var(--track-ara)] text-white',               inactive: 'bg-[var(--track-ara-soft)] text-[var(--track-ara)] hover:opacity-80' },
};

export function StudentFilter({ students, selectedId, onSelect, showAll = true }: Props) {
  const [group, setGroup] = useState<Group>('Tümü');
  const [search, setSearch] = useState('');

  // Gruba göre filtrele
  const byGroup = useMemo(() =>
    group === 'Tümü' ? students : students.filter((s) => getGroup(s.track) === group),
    [students, group]
  );

  // İsme göre filtrele
  const visible = useMemo(() =>
    search.trim()
      ? byGroup.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()))
      : byGroup,
    [byGroup, search]
  );

  // Grup sayılarını hesapla
  const counts = useMemo(() => ({
    Tümü: students.length,
    LGS: students.filter((s) => getGroup(s.track) === 'LGS').length,
    YKS: students.filter((s) => getGroup(s.track) === 'YKS').length,
    'Ara Sınıf': students.filter((s) => getGroup(s.track) === 'Ara Sınıf').length,
  }), [students]);

  return (
    <div className="mb-4 space-y-2">
      {/* Grup butonları */}
      <div className="flex flex-wrap gap-1.5">
        {GROUP_BUTTONS.map((g) => {
          const count = counts[g];
          if (!showAll && g === 'Tümü') return null;
          if (count === 0 && g !== 'Tümü') return null; // boş grupları gizle
          const isActive = group === g;
          const style = GROUP_STYLES[g];
          return (
            <button
              key={g}
              onClick={() => {
                setGroup(g);
                setSearch('');
                // Seçili öğrenci bu grupta değilse seçimi sıfırla
                if (showAll && g === 'Tümü') onSelect('');
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${isActive ? style.active : style.inactive}`}
            >
              {g}
              <span className={`ml-1 text-[10px] ${isActive ? 'opacity-70' : 'opacity-60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Arama + öğrenci butonları */}
      {students.length > 4 && (
        <div className="relative">
          <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsme göre ara..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--paper)] py-1.5 pl-7 pr-7 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:bg-[var(--card)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)]">
              <IconX size={13} />
            </button>
          )}
        </div>
      )}

      {/* Öğrenci butonları */}
      <div className="flex flex-wrap gap-1.5">
        {showAll && group === 'Tümü' && !search && (
          <button
            onClick={() => onSelect('')}
            className={`rounded-full px-3 py-1 text-[12px] font-medium ${!selectedId ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'}`}
          >
            Tümü
          </button>
        )}
        {visible.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              selectedId === s.id ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'
            }`}
          >
            {s.full_name}
          </button>
        ))}
        {visible.length === 0 && (
          <span className="py-1 text-[12px] text-[var(--ink-muted)]">Öğrenci bulunamadı.</span>
        )}
      </div>
    </div>
  );
}