// src/lib/effective-coach.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEffectiveCoachId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('teacher_access_profiles')
    .select('status, mentor_id')
    .eq('teacher_id', userId)
    .maybeSingle();

  return data && data.status !== 'coach' && data.mentor_id ? data.mentor_id : userId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getVisibleCoachIds(supabase: any, userId: string, includeInterns = false): Promise<string[]> {
  const { data: own } = await supabase
    .from('teacher_access_profiles')
    .select('status, mentor_id')
    .eq('teacher_id', userId)
    .maybeSingle();

  // stajyer: rehber öğretmenin öğrencileri + kendi eklediği öğrenciler
  if (own && own.status !== 'coach' && own.mentor_id) {
    return [own.mentor_id, userId];
  }

  // koç: varsayılan sadece kendi öğrencileri
  if (!includeInterns) return [userId];

  const { data: interns } = await supabase
    .from('teacher_access_profiles')
    .select('teacher_id')
    .eq('mentor_id', userId)
    .neq('status', 'coach');

  return [userId, ...((interns ?? []).map((i: { teacher_id: string }) => i.teacher_id))];
}
export type StudentScope = {
  userId: string;
  coachIds: string[];
  isMentor: boolean;
  ownOnly: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStudentScope(supabase: any, userId: string, includeInterns = false): Promise<StudentScope> {
  const { data: own } = await supabase
    .from('teacher_access_profiles')
    .select('status, mentor_id')
    .eq('teacher_id', userId)
    .maybeSingle();

  // stajyer hesabı: eskisi gibi çalışır
  if (own && own.status !== 'coach' && own.mentor_id) {
    return { userId, coachIds: [own.mentor_id, userId], isMentor: false, ownOnly: false };
  }

  const { data: interns } = await supabase
    .from('teacher_access_profiles')
    .select('teacher_id')
    .eq('mentor_id', userId)
    .neq('status', 'coach');

  const internIds = (interns ?? []).map((i: { teacher_id: string }) => i.teacher_id);
  return { userId, coachIds: [userId, ...internIds], isMentor: true, ownOnly: !includeInterns };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyStudentScope(query: any, scope: StudentScope) {
  if (!scope.ownOnly) return query.in('coach_id', scope.coachIds);
  return query.or(
    `responsible_coach_id.eq.${scope.userId},` +
    `and(coach_id.eq.${scope.userId},responsible_coach_id.is.null,responsible_coach_other_name.is.null)`
  );
}

export function isInternStudent(
  s: { coach_id: string; responsible_coach_id?: string | null; responsible_coach_other_name?: string | null },
  userId: string
): boolean {
  const mine =
    s.responsible_coach_id === userId ||
    (s.coach_id === userId && !s.responsible_coach_id && !s.responsible_coach_other_name);
  return !mine;
}