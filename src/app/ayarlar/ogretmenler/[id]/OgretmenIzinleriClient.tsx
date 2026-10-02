'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft, IconChevronDown, IconChevronRight, IconDeviceFloppy } from '@tabler/icons-react';

type TeacherStatus = 'coach' | 'intern' | 'dorm_supervisor';
type PermissionPage = 'student_info' | 'exams' | 'topic_progress' | 'weekly_tracking' | 'meetings' | 'tasks';

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
};

type StudentOption = {
  id: string;
  coach_id: string;
  full_name: string;
  kurum: string | null;
  sinif_sube: string | null;
};

type KurumScope = {
  allowedClasses: string[];
  excludedStudentIds: string[];
};

type Permission = {
  enabled: boolean;
  scopes: Record<string, KurumScope>;
};

type AccessProfile = {
  status: TeacherStatus;
  mentor_id: string | null;
} | null;

type PagePermissionRow = {
  page: PermissionPage;
  enabled: boolean;
  allowed_classes: string[] | null;
  excluded_student_ids: string[] | null;
  allowed_kurums?: string[] | null;
  scopes?: Record<string, KurumScope> | null;
};

const STATUS_OPTIONS: { value: TeacherStatus; label: string; desc: string }[] = [
  { value: 'coach', label: 'Koç Öğretmen (Bağımsız)', desc: 'Kendi öğrencilerini ve kendi sürecini yönetir.' },
  { value: 'intern', label: 'Stajyer Öğretmen', desc: 'Bağlı olduğu rehber öğretmenin verdiği kurum, sınıf/şube ve öğrenci izinleriyle çalışır.' },
  { value: 'dorm_supervisor', label: 'Belletmen', desc: 'Kurum içi belirli alanlarda sınırlı erişimle çalışır.' },
];

const PAGE_OPTIONS: { key: PermissionPage; label: string; desc: string }[] = [
  { key: 'student_info', label: 'Öğrenci bilgileri', desc: 'Öğrenci kartları ve temel bilgiler' },
  { key: 'exams', label: 'Deneme sonuçları', desc: 'Deneme listeleri ve analiz ekranları' },
  { key: 'topic_progress', label: 'Konu ilerleyişi', desc: 'Konu tamamlama ve kaynak takibi' },
  { key: 'weekly_tracking', label: 'Haftalık takip', desc: 'Haftalık çalışma/soru takip ekranları' },
  { key: 'meetings', label: 'Görüşmeler', desc: 'Stajyer kendi görüşmelerini görür; rehber öğretmen hepsini ayırt ederek görebilir' },
  { key: 'tasks', label: 'Görevler', desc: 'Öğrenciye bağlı yapılacak işler' },
];

const NO_KURUM = '__kurumsuz__';

function kurumKey(kurum: string | null) {
  return kurum?.trim() || NO_KURUM;
}

function kurumLabel(key: string) {
  return key === NO_KURUM ? 'Kurumsuz' : key;
}

function emptyScope(): KurumScope {
  return { allowedClasses: [], excludedStudentIds: [] };
}

function emptyPermissions(): Record<PermissionPage, Permission> {
  return PAGE_OPTIONS.reduce((acc, p) => {
    acc[p.key] = { enabled: false, scopes: {} };
    return acc;
  }, {} as Record<PermissionPage, Permission>);
}

function legacyScopes(row: PagePermissionRow): Record<string, KurumScope> {
  if (row.scopes && typeof row.scopes === 'object') return row.scopes;
  const kurums = row.allowed_kurums?.length ? row.allowed_kurums : [];
  return kurums.reduce((acc, kurum) => {
    acc[kurum] = {
      allowedClasses: row.allowed_classes ?? [],
      excludedStudentIds: row.excluded_student_ids ?? [],
    };
    return acc;
  }, {} as Record<string, KurumScope>);
}

export function OgretmenIzinleriClient({
  teacher,
  mentors,
  students,
  accessProfile,
  pagePermissions,
}: {
  teacher: Teacher;
  mentors: Teacher[];
  students: StudentOption[];
  accessProfile: AccessProfile;
  pagePermissions: PagePermissionRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<TeacherStatus>(accessProfile?.status ?? 'coach');
  const [mentorId, setMentorId] = useState(accessProfile?.mentor_id ?? mentors[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openKurum, setOpenKurum] = useState<string | null>(null);
  const [openPage, setOpenPage] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<PermissionPage, Permission>>(() => {
    const initial = emptyPermissions();
    pagePermissions.forEach((row) => {
      initial[row.page] = {
        enabled: row.enabled,
        scopes: legacyScopes(row),
      };
    });
    return initial;
  });

  const mentorStudents = useMemo(
    () => students.filter((student) => student.coach_id === mentorId),
    [students, mentorId]
  );

  const kurumlar = useMemo(() => {
    return Array.from(new Set(mentorStudents.map((student) => kurumKey(student.kurum))))
      .sort((a, b) => kurumLabel(a).localeCompare(kurumLabel(b), 'tr'));
  }, [mentorStudents]);

  const visibleKurumSet = useMemo(() => new Set(kurumlar), [kurumlar]);

  function studentsForKurum(kurum: string) {
    return mentorStudents.filter((student) => kurumKey(student.kurum) === kurum);
  }

  function classesForKurum(kurum: string) {
    return Array.from(
      new Set(studentsForKurum(kurum).map((student) => student.sinif_sube?.trim()).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, 'tr'));
  }

  function getScope(page: PermissionPage, kurum: string) {
    return permissions[page].scopes[kurum];
  }

  function setPageScope(page: PermissionPage, kurum: string, scope: KurumScope | null) {
    setPermissions((prev) => {
      const scopes = { ...prev[page].scopes };
      if (scope) scopes[kurum] = scope;
      else delete scopes[kurum];
      return {
        ...prev,
        [page]: {
          ...prev[page],
          enabled: Object.keys(scopes).length > 0,
          scopes,
        },
      };
    });
  }

  function togglePageForKurum(page: PermissionPage, kurum: string) {
    const existing = getScope(page, kurum);
    setPageScope(page, kurum, existing ? null : emptyScope());
  }

  function updateScope(page: PermissionPage, kurum: string, patch: Partial<KurumScope>) {
    setPermissions((prev) => {
      const currentScope = prev[page].scopes[kurum] ?? emptyScope();
      const scopes = {
        ...prev[page].scopes,
        [kurum]: { ...currentScope, ...patch },
      };
      return {
        ...prev,
        [page]: { ...prev[page], enabled: true, scopes },
      };
    });
  }

  function toggleClass(page: PermissionPage, kurum: string, className: string) {
    const current = getScope(page, kurum)?.allowedClasses ?? [];
    updateScope(page, kurum, {
      allowedClasses: current.includes(className)
        ? current.filter((c) => c !== className)
        : [...current, className],
    });
  }

  function toggleExcludedStudent(page: PermissionPage, kurum: string, studentId: string) {
    const current = getScope(page, kurum)?.excludedStudentIds ?? [];
    updateScope(page, kurum, {
      excludedStudentIds: current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    });
  }

  function visibleScopesFor(page: PermissionPage) {
    return Object.fromEntries(
      Object.entries(permissions[page].scopes).filter(([kurum]) => visibleKurumSet.has(kurum))
    ) as Record<string, KurumScope>;
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase as any).from('teacher_access_profiles').upsert({
      teacher_id: teacher.id,
      status,
      mentor_id: status === 'coach' ? null : mentorId || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setMessage('Kaydedilemedi: ' + profileError.message);
      setSaving(false);
      return;
    }

    const rows = PAGE_OPTIONS.map((page) => {
      const scopes = status === 'coach' ? {} : visibleScopesFor(page.key);
      const scopeValues = Object.values(scopes);
      return {
        teacher_id: teacher.id,
        page: page.key,
        enabled: status === 'coach' ? false : Object.keys(scopes).length > 0,
        allowed_kurums: Object.keys(scopes),
        allowed_classes: Array.from(new Set(scopeValues.flatMap((scope) => scope.allowedClasses))),
        excluded_student_ids: Array.from(new Set(scopeValues.flatMap((scope) => scope.excludedStudentIds))),
        scopes,
        updated_at: new Date().toISOString(),
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: permissionsError } = await (supabase as any).from('teacher_page_permissions').upsert(rows);

    if (permissionsError) {
      setMessage('İzinler kaydedilemedi: ' + permissionsError.message);
      setSaving(false);
      return;
    }

    setMessage('İzinler kaydedildi.');
    setSaving(false);
    router.refresh();
  }

  const isRestricted = status !== 'coach';

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/ayarlar" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold text-gray-900">{teacher.full_name}</h1>
          <p className="text-[12px] text-gray-500">Öğretmen izinleri ve statüsü</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <IconDeviceFloppy size={15} />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
      )}

      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Statü</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  status === option.value ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-[13px] font-semibold text-gray-900">{option.label}</div>
                <div className="mt-1 text-[12px] leading-5 text-gray-500">{option.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {isRestricted && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Bağlı olduğu rehber öğretmen</h2>
            <select
              value={mentorId}
              onChange={(e) => {
                setMentorId(e.target.value);
                setOpenKurum(null);
                setOpenPage(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:max-w-md"
            >
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>{mentor.full_name}</option>
              ))}
            </select>
          </section>
        )}

        {isRestricted && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Kurum izinleri</h2>
              <p className="mt-1 text-[12px] text-gray-500">Seçili rehber öğretmenin kurumları listelenir. Kurumu açınca alanları, alanı açınca Sınıf / Şube ve öğrenci istisnalarını seçebilirsiniz.</p>
            </div>

            {kurumlar.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-gray-400">Bu rehber öğretmene bağlı kurum bilgisi olan öğrenci yok.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {kurumlar.map((kurum) => {
                  const kurumStudents = studentsForKurum(kurum);
                  const kurumClasses = classesForKurum(kurum);
                  return (
                    <div key={kurum} className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setOpenKurum(openKurum === kurum ? null : kurum)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div>
                          <div className="text-[14px] font-semibold text-gray-900">{kurumLabel(kurum)}</div>
                          <div className="text-[12px] text-gray-500">{kurumStudents.length} öğrenci</div>
                        </div>
                        {openKurum === kurum ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      </button>

                      {openKurum === kurum && (
                        <div className="mt-4 space-y-3">
                          {PAGE_OPTIONS.map((page) => {
                            const scope = getScope(page.key, kurum);
                            const isPageOpen = openPage === `${kurum}:${page.key}`;
                            const allowedStudents = !scope || scope.allowedClasses.length === 0
                              ? kurumStudents
                              : kurumStudents.filter((student) => student.sinif_sube && scope.allowedClasses.includes(student.sinif_sube));
                            return (
                              <div key={page.key} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={!!scope}
                                    onChange={() => togglePageForKurum(page.key, kurum)}
                                    className="mt-1 h-4 w-4 accent-blue-600"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setOpenPage(isPageOpen ? null : `${kurum}:${page.key}`)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <div className="text-[13px] font-semibold text-gray-900">{page.label}</div>
                                        <div className="text-[12px] text-gray-500">{page.desc}</div>
                                      </div>
                                      {isPageOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                    </div>
                                  </button>
                                </div>

                                {isPageOpen && scope && (
                                  <div className="mt-4 space-y-4 pl-7">
                                    <div>
                                      <div className="mb-2 text-[12px] font-semibold text-gray-500">Sınıf / Şube izni</div>
                                      <div className="flex flex-wrap gap-2">
                                        {kurumClasses.length === 0 ? (
                                          <span className="text-[12px] text-gray-400">Bu kurumda Sınıf / Şube bilgisi olan öğrenci yok.</span>
                                        ) : kurumClasses.map((className) => (
                                          <button
                                            key={className}
                                            type="button"
                                            onClick={() => toggleClass(page.key, kurum, className)}
                                            className={`rounded-full border px-3 py-1 text-[12px] ${
                                              scope.allowedClasses.includes(className)
                                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                          >
                                            {className}
                                          </button>
                                        ))}
                                      </div>
                                      <p className="mt-2 text-[11px] text-gray-400">Hiç sınıf seçilmezse bu kurum için tüm sınıflar açık kabul edilir.</p>
                                    </div>

                                    <div>
                                      <div className="mb-2 text-[12px] font-semibold text-gray-500">İzin dışı bırakılacak öğrenciler</div>
                                      <div className="grid gap-2 md:grid-cols-2">
                                        {allowedStudents.length === 0 ? (
                                          <span className="text-[12px] text-gray-400">Seçili sınıflarda öğrenci yok.</span>
                                        ) : allowedStudents.map((student) => (
                                          <label key={student.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-[12px] text-gray-700">
                                            <input
                                              type="checkbox"
                                              checked={scope.excludedStudentIds.includes(student.id)}
                                              onChange={() => toggleExcludedStudent(page.key, kurum, student.id)}
                                              className="h-4 w-4 accent-red-600"
                                            />
                                            <span className="min-w-0 flex-1 truncate">{student.full_name}</span>
                                            <span className="text-gray-400">{student.sinif_sube || 'Sınıfsız'}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}