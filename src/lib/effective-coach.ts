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
export async function getVisibleCoachIds(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('teacher_access_profiles')
    .select('status, mentor_id')
    .eq('teacher_id', userId)
    .maybeSingle();

  return data && data.status !== 'coach' && data.mentor_id
    ? [data.mentor_id, userId]
    : [userId];
}