'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ExamGroup = 'LGS' | 'YKS' | null;
export type YksTrack = 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL' | null;
import { getVisibleCoachIds } from '@/lib/effective-coach';

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
  getSinifOnerileri: (kurum: string) => string[];
  

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
  getSinifOnerileri: () => [],
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
  const [classesByKurum, setClassesByKurum] = useState<Record<string, string[]>>({});

  const [donem, setDonem] = useState<string | null>(null);
  const [availableDonemler, setAvailableDonemler] = useState<string[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allStudents, setAllStudents] = useState<any[]>([]);

  const supabase = createClient();

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const includeInterns = document.cookie.split('; ').includes('show_interns=1');
    const coachIds = await getVisibleCoachIds(supabase, user.id, includeInterns);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentsData } = await (supabase as any)
      .from('students')
      .select('track, kurum, donem, sinif_sube')
      .in('coach_id', coachIds)

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

    const classMap: Record<string, Set<string>> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    students.forEach((s: any) => {
      const k = s.kurum?.trim();
      const sube = s.sinif_sube?.trim();
      if (!k || !sube) return;
      if (!classMap[k]) classMap[k] = new Set();
      classMap[k].add(sube);
    });
    const classesByKurumObj: Record<string, string[]> = {};
    Object.entries(classMap).forEach(([k, set]) => {
      classesByKurumObj[k] = Array.from(set).sort();
    });
    setClassesByKurum(classesByKurumObj);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: donemlerData } = await (supabase as any)
      .from('donemler')
      .select('donem_adi')
      .in('coach_id', coachIds)
      .order('created_at', { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const donemList: string[] = (donemlerData ?? []).map((d: any) => d.donem_adi);
    setAvailableDonemler(donemList);

    // Varsayılan olarak tüm dönemleri göster; kullanıcı isterse dönem filtresi seçer.
    setDonem((prev) => (prev && donemList.includes(prev) ? prev : null));
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

  function getSinifOnerileri(kurum: string): string[] {
    if (!kurum) return [];
    return classesByKurum[kurum.trim()] ?? [];
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
      kurum, setKurum, availableKurumlar, getSinifOnerileri,
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