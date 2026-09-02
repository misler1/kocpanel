'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ExamGroup = 'LGS' | 'YKS' | null;
export type YksTrack = 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL' | null;

export interface FilterableStudent {
  track?: string | null;
  kurum?: string | null;
  donem?: string | null;
}

interface ExamFilterContextType {
  // Sınav türü filtresi
  examGroup: ExamGroup;
  yksTrack: YksTrack;
  setExamGroup: (g: ExamGroup) => void;
  setYksTrack: (t: YksTrack) => void;
  availableGroups: ExamGroup[];

  // Kurum filtresi
  kurum: string | null; // null = Tümü
  setKurum: (k: string | null) => void;
  availableKurumlar: string[];

  // Dönem filtresi
  donem: string | null; // null = Tüm dönemler
  setDonem: (d: string | null) => void;
  availableDonemler: string[]; // eskiden yeniye sıralı

  filteredStudentCount: number;
  matchesFilter: (student: FilterableStudent | null | undefined) => boolean;
  refreshOptions: () => void;
}

const ExamFilterContext = createContext<ExamFilterContextType>({
  examGroup: null,
  yksTrack: null,
  setExamGroup: () => {},
  setYksTrack: () => {},
  availableGroups: [],
  kurum: null,
  setKurum: () => {},
  availableKurumlar: [],
  donem: null,
  setDonem: () => {},
  availableDonemler: [],
  filteredStudentCount: 0,
  matchesFilter: () => true,
  refreshOptions: () => {},
});

export function ExamFilterProvider({ children }: { children: ReactNode }) {
  const [examGroup, setExamGroupState] = useState<ExamGroup>(null);
  const [yksTrack, setYksTrack] = useState<YksTrack>(null);
  const [availableGroups, setAvailableGroups] = useState<ExamGroup[]>([]);

  const [kurum, setKurum] = useState<string | null>(null);
  const [availableKurumlar, setAvailableKurumlar] = useState<string[]>([]);

  const [donem, setDonem] = useState<string | null>(null);
  const [availableDonemler, setAvailableDonemler] = useState<string[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allStudents, setAllStudents] = useState<any[]>([]);

  const supabase = createClient();

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentsData } = await (supabase as any)
      .from('students')
      .select('track, kurum, donem')
      .eq('coach_id', user.id);

    const students = studentsData ?? [];
    setAllStudents(students);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks: string[] = students.map((s: any) => s.track).filter(Boolean);
    const hasLgs = tracks.some((t) => t === 'LGS');
    const hasYks = tracks.some((t) => t.startsWith('YKS'));
    const groups: ExamGroup[] = [];
    if (hasLgs) groups.push('LGS');
    if (hasYks) groups.push('YKS');
    setAvailableGroups(groups);

    const kurumSet = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    students.forEach((s: any) => { if (s.kurum && s.kurum.trim()) kurumSet.add(s.kurum.trim()); });
    setAvailableKurumlar(Array.from(kurumSet).sort());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: donemlerData } = await (supabase as any)
      .from('donemler')
      .select('donem_adi')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const donemList: string[] = (donemlerData ?? []).map((d: any) => d.donem_adi);
    setAvailableDonemler(donemList);

    // Varsayılan: en güncel (en son açılan) dönem seçili olsun
    setDonem((prev) => prev ?? donemList[donemList.length - 1] ?? null);
  }

  useEffect(() => {
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSetExamGroup(g: ExamGroup) {
    setExamGroupState(g);
    setYksTrack(null);
  }

  function matchesFilter(student: FilterableStudent | null | undefined) {
    if (!student) return false;
    if (examGroup === 'LGS' && student.track !== 'LGS') return false;
    if (examGroup === 'YKS') {
      if (!student.track || !student.track.startsWith('YKS')) return false;
      if (yksTrack && student.track !== yksTrack) return false;
    }
    if (kurum && student.kurum !== kurum) return false;
    if (donem && student.donem !== donem) return false;
    return true;
  }

  const filteredStudentCount = useMemo(() => {
    return allStudents.filter(matchesFilter).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStudents, examGroup, yksTrack, kurum, donem]);

  return (
    <ExamFilterContext.Provider value={{
      examGroup, yksTrack,
      setExamGroup: handleSetExamGroup,
      setYksTrack,
      availableGroups,
      kurum, setKurum, availableKurumlar,
      donem, setDonem, availableDonemler,
      filteredStudentCount,
      matchesFilter,
      refreshOptions: loadAll,
    }}>
      {children}
    </ExamFilterContext.Provider>
  );
}

export function useExamFilter() {
  return useContext(ExamFilterContext);
}