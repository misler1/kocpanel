import { getStudentScope } from '@/lib/effective-coach';

/**
 * Deneme yüklemede eşleştirme adayları: koçun kendi öğrencileri + stajyerlerinin öğrencileri
 * (stajyer hesabı için: rehber koçun öğrencileri + kendi öğrencileri). Pasif öğrenciler hariç.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUploadCandidates(supabase: any, userId: string): Promise<{ id: string; full_name: string }[]> {
  const scope = await getStudentScope(supabase, userId, true);
  const { data } = await supabase
    .from('students').select('id, full_name')
    .in('coach_id', scope.coachIds).neq('status', 'pasif')
    .order('full_name');
  return (data ?? []).map((s: { id: string; full_name: string }) => ({ id: s.id, full_name: s.full_name }));
}
