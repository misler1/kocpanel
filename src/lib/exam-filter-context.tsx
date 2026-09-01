'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ExamGroup = 'LGS' | 'YKS' | null;
export type YksTrack = 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL' | null;

interface ExamFilterContextType {
  examGroup: ExamGroup;
  yksTrack: YksTrack;
  setExamGroup: (g: ExamGroup) => void;
  setYksTrack: (t: YksTrack) => void;
  availableGroups: ExamGroup[];
  filteredStudentCount: number; 
  matchesFilter: (track: string | null | undefined) => boolean;
}

const ExamFilterContext = createContext<ExamFilterContextType>({
  examGroup: null,
  yksTrack: null,
  setExamGroup: () => {},
  setYksTrack: () => {},
  availableGroups: [],
  filteredStudentCount: 0,
  matchesFilter: () => true,
});

export function ExamFilterProvider({ children }: { children: ReactNode }) {
  const [examGroup, setExamGroup] = useState<ExamGroup>(null);
  const [yksTrack, setYksTrack] = useState<YksTrack>(null);
  const [availableGroups, setAvailableGroups] = useState<ExamGroup[]>([]);
  const [allTracks, setAllTracks] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('students')
        .select('track')
        .eq('coach_id', user.id);

      if (!data) return;

      const tracks: string[] = data.map((s: { track: string }) => s.track);
      setAllTracks(tracks);

      const hasLgs = tracks.some(t => t === 'LGS');
      const hasYks = tracks.some(t => t.startsWith('YKS'));

      const groups: ExamGroup[] = [];
      if (hasLgs) groups.push('LGS');
      if (hasYks) groups.push('YKS');
      setAvailableGroups(groups);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSetExamGroup(g: ExamGroup) {
    setExamGroup(g);
    setYksTrack(null);
  }

  // Bir öğrencinin track'i şu anki filtreye uyuyor mu?
    function matchesFilter(track: string | null | undefined) {
    if (!examGroup) return true;
    if (!track) return false;
    if (examGroup === 'LGS') return track === 'LGS';
    if (examGroup === 'YKS') {
      if (yksTrack) return track === yksTrack;
      return track.startsWith('YKS');
    }
    return true;
  }

  const filteredStudentCount = useMemo(() => {
    return allTracks.filter(matchesFilter).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks, examGroup, yksTrack]);

  return (
    <ExamFilterContext.Provider value={{
      examGroup, yksTrack,
      setExamGroup: handleSetExamGroup,
      setYksTrack,
      availableGroups,
      filteredStudentCount,
      matchesFilter,
    }}>
      {children}
    </ExamFilterContext.Provider>
  );
}

export function useExamFilter() {
  return useContext(ExamFilterContext);
}