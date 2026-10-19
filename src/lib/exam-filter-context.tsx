'use client';

import {
  createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';

export type ExamGroup = 'LGS' | 'YKS' | null;
export type YksTrack = 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL' | null;

export interface FilterableStudent {
  track?: string | null;
  kurum?: string | null;
  donem?: string | null;
}

interface StudentRow extends FilterableStudent {
  sinif_sube?: string | null;
}

const FILTER_KEY = 'exam_filter_v2';
const OPTIONS_KEY = 'exam_filter_options_v1';
const FILTER_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

interface PersistedFilter {
  userId: string | null;
  examGroup: ExamGroup;
  yksTrack: YksTrack;
  kurum: string | null;
  donem: string | null;
  expiresAt: number;
}

interface PersistedOptions {
  userId: string;
  students: StudentRow[];
  donemler: string[];
}

/** Çıkış butonun supabase.auth.signOut() çağırmıyorsa bunu elle çağır. */
export function clearExamFilterStorage() {
  try {
    localStorage.removeItem(FILTER_KEY);
    localStorage.removeItem(OPTIONS_KEY);
  } catch {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ExamFilterContextType {
  examGroup: ExamGroup;
  yksTrack: YksTrack;
  setExamGroup: (g: ExamGroup) => void;
  setYksTrack: (t: YksTrack) => void;
  availableGroups: ExamGroup[];

  kurum: string | null;
  setKurum: (k: string | null) => void;
  availableKurumlar: string[];
  getSinifOnerileri: (kurum: string) => string[];

  donem: string | null;
  setDonem: (d: string | null) => void;
  availableDonemler: string[];

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
  const supabase = useMemo(() => createClient(), []);

  const [examGroup, setExamGroupState] = useState<ExamGroup>(null);
  const [yksTrack, setYksTrackState] = useState<YksTrack>(null);
  const [kurum, setKurumState] = useState<string | null>(null);
  const [donem, setDonemState] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [availableDonemler, setAvailableDonemler] = useState<string[]>([]);
  const [freshLoaded, setFreshLoaded] = useState(false); // ağdan taze veri geldi mi
  const [restored, setRestored] = useState(false);

  const dirtyRef = useRef(false);                       // kullanıcı filtreyi değiştirdi mi
  const savedUserIdRef = useRef<string | null>(null);   // kayıtlı filtrenin sahibi
  const currentUserIdRef = useRef<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const inflightRef = useRef<string | null>(null);

  // ---- 1) Açılışta: kayıtlı filtre + önbellekteki seçenekleri anında yükle ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_KEY);
      if (raw) {
        const f: PersistedFilter = JSON.parse(raw);
        if (Date.now() > f.expiresAt) {
          localStorage.removeItem(FILTER_KEY);
        } else {
          savedUserIdRef.current = f.userId ?? null;
          setExamGroupState(f.examGroup ?? null);
          setYksTrackState(f.yksTrack ?? null);
          setKurumState(f.kurum ?? null);
          setDonemState(f.donem ?? null);
        }
      }
      const rawOpt = localStorage.getItem(OPTIONS_KEY);
      if (rawOpt) {
        const o: PersistedOptions = JSON.parse(rawOpt);
        setAllStudents(o.students ?? []);
        setAvailableDonemler(o.donemler ?? []);
      }
    } catch {}
    setRestored(true);
  }, []);

  // ---- 2) Filtre değişince kaydet (süre en son değişiklikten itibaren 24 saat) ----
  useEffect(() => {
    if (!restored || !dirtyRef.current) return;
    try {
      const payload: PersistedFilter = {
        userId: currentUserIdRef.current ?? savedUserIdRef.current,
        examGroup, yksTrack, kurum, donem,
        expiresAt: Date.now() + FILTER_TTL_MS,
      };
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch {}
  }, [restored, examGroup, yksTrack, kurum, donem]);

  const resetFilters = useCallback(() => {
    dirtyRef.current = false;
    savedUserIdRef.current = null;
    setExamGroupState(null);
    setYksTrackState(null);
    setKurumState(null);
    setDonemState(null);
  }, []);

  // ---- 3) Veri yükleme (paralel + tekrar deneme) ----
  const loadAll = useCallback(async (userIdArg?: string, force = false) => {
    let userId = userIdArg;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;
    if (!force && inflightRef.current === userId) return;
    inflightRef.current = userId;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const includeInterns = document.cookie.split('; ').includes('show_interns=1');
          const scope = await getStudentScope(supabase, userId, includeInterns);

          const studentsQuery = applyStudentScope(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('students').select('track, kurum, donem, sinif_sube').neq('status', 'pasif'),
            scope
          );
          const donemQuery = scope.coachIds?.length
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (supabase as any).from('donemler').select('donem_adi')
                .in('coach_id', scope.coachIds).order('created_at', { ascending: true })
            : Promise.resolve({ data: [], error: null });

          const [studentsRes, donemRes] = await Promise.all([studentsQuery, donemQuery]);
          if (studentsRes.error) throw studentsRes.error;
          if (donemRes.error) throw donemRes.error;

          const students: StudentRow[] = studentsRes.data ?? [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const donemList: string[] = (donemRes.data ?? []).map((d: any) => d.donem_adi);

          // Kayıtlı filtre başka bir kullanıcıya aitse sıfırla
          if (savedUserIdRef.current && savedUserIdRef.current !== userId) {
            resetFilters();
            clearExamFilterStorage();
          }
          currentUserIdRef.current = userId;
          loadedUserRef.current = userId;

          setAllStudents(students);
          setAvailableDonemler(donemList);
          setFreshLoaded(true);

          try {
            const opt: PersistedOptions = { userId, students, donemler: donemList };
            localStorage.setItem(OPTIONS_KEY, JSON.stringify(opt));
          } catch {}
          return;
        } catch (err) {
          console.error('Filtre verisi yüklenemedi, tekrar denenecek:', err);
          await sleep(1500 * (attempt + 1));
        }
      }
    } finally {
      inflightRef.current = null;
    }
  }, [supabase, resetFilters]);

  // ---- 4) Oturum olaylarını dinle (oturum geç hazırlansa da yükler) ----
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user && loadedUserRef.current !== session.user.id) {
        loadAll(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        loadedUserRef.current = null;
        currentUserIdRef.current = null;
        clearExamFilterStorage();
        resetFilters();
        setAllStudents([]);
        setAvailableDonemler([]);
        setFreshLoaded(false);
        return;
      }
      const u = session?.user;
      if (u && loadedUserRef.current !== u.id) {
        // callback içinde doğrudan supabase çağrısı yapma, ertele
        setTimeout(() => loadAll(u.id), 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadAll, resetFilters]);

  // ---- Türetilmiş seçenekler ----
  const availableGroups = useMemo<ExamGroup[]>(() => {
    const g: ExamGroup[] = [];
    if (allStudents.some((s) => s.track === 'LGS')) g.push('LGS');
    if (allStudents.some((s) => s.track?.startsWith('YKS'))) g.push('YKS');
    return g;
  }, [allStudents]);

  const availableKurumlar = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s) => { if (s.kurum?.trim()) set.add(s.kurum.trim()); });
    return Array.from(set).sort();
  }, [allStudents]);

  const classesByKurum = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    allStudents.forEach((s) => {
      const k = s.kurum?.trim();
      const sube = s.sinif_sube?.trim();
      if (!k || !sube) return;
      (map[k] ??= new Set()).add(sube);
    });
    const out: Record<string, string[]> = {};
    Object.entries(map).forEach(([k, set]) => { out[k] = Array.from(set).sort(); });
    return out;
  }, [allStudents]);

  // Taze veri gelince artık geçersiz olan seçimleri temizle
  useEffect(() => {
    if (!freshLoaded) return;
    setExamGroupState((p) => (p && availableGroups.includes(p) ? p : null));
    setKurumState((p) => (p && availableKurumlar.includes(p) ? p : null));
    setDonemState((p) => (p && availableDonemler.includes(p) ? p : null));
  }, [freshLoaded, availableGroups, availableKurumlar, availableDonemler]);

  // ---- Setter'lar (kullanıcı değişikliğini işaretler) ----
  const setExamGroup = useCallback((g: ExamGroup) => {
    dirtyRef.current = true;
    setExamGroupState(g);
    setYksTrackState(null);
  }, []);
  const setYksTrack = useCallback((t: YksTrack) => {
    dirtyRef.current = true;
    setYksTrackState(t);
  }, []);
  const setKurum = useCallback((k: string | null) => {
    dirtyRef.current = true;
    setKurumState(k);
  }, []);
  const setDonem = useCallback((d: string | null) => {
    dirtyRef.current = true;
    setDonemState(d);
  }, []);

  function matchesFilter(student: FilterableStudent | null | undefined) {
    if (!student) return false;
    if (examGroup === 'LGS' && student.track !== 'LGS') return false;
    if (examGroup === 'YKS') {
      if (!student.track || !student.track.startsWith('YKS')) return false;
      if (yksTrack && student.track !== yksTrack) return false;
    }
    if (examGroup !== 'YKS' && yksTrack && student.track !== yksTrack) return false;
    if (kurum && student.kurum !== kurum) return false;
    if (donem && student.donem !== donem) return false;
    return true;
  }

  function getSinifOnerileri(k: string): string[] {
    if (!k) return [];
    return classesByKurum[k.trim()] ?? [];
  }

  const filteredStudentCount = useMemo(
    () => allStudents.filter(matchesFilter).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStudents, examGroup, yksTrack, kurum, donem]
  );

  return (
    <ExamFilterContext.Provider value={{
      examGroup, yksTrack, setExamGroup, setYksTrack,
      availableGroups,
      kurum, setKurum, availableKurumlar, getSinifOnerileri,
      donem, setDonem, availableDonemler,
      filteredStudentCount,
      matchesFilter,
      refreshOptions: () => { loadAll(undefined, true); },
    }}>
      {children}
    </ExamFilterContext.Provider>
  );
}

export function useExamFilter() {
  return useContext(ExamFilterContext);
}