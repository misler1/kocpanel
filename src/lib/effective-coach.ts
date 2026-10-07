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