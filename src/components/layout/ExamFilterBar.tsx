'use client';

import { useExamFilter } from '@/lib/exam-filter-context';

export function ExamFilterBar() {
  const { examGroup, yksTrack, setExamGroup, setYksTrack, availableGroups } = useExamFilter();

  // Sadece bir sınav türü varsa hiç gösterme
  if (availableGroups.length < 2) return null;

  const yksSubTracks: { value: 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL'; label: string }[] = [
    { value: 'YKS_SAY', label: 'SAY' },
    { value: 'YKS_SOZ', label: 'SÖZ' },
    { value: 'YKS_EA', label: 'EA' },
    { value: 'YKS_DIL', label: 'DİL' },
  ];

  return (
    <div className="mb-3 border-b border-gray-200 pb-3">
      <div className="flex gap-1.5">
        <button
          onClick={() => setExamGroup(examGroup === 'LGS' ? null : 'LGS')}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            examGroup === 'LGS'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          LGS
        </button>
        <button
          onClick={() => setExamGroup(examGroup === 'YKS' ? null : 'YKS')}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            examGroup === 'YKS'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                yksTrack === t.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}