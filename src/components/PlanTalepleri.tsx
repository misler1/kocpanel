/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { PlanTalepleriClient } from './PlanTalepleriClient';
import { OgrenciProgramOnaylari } from './OgrenciProgramOnaylari';

// Koçun onayını bekleyen haftalık program talepleri (RLS: yalnızca kendi öğrencileri).
export async function PlanTalepleri() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await (supabase as any)
    .from('weekly_plan_requests')
    .select('id, kind, week_start, payload, note, created_at, students(full_name)')
    .eq('coach_id', user.id)
    .eq('status', 'bekliyor')
    .order('created_at', { ascending: true });

  // Öğrencinin kendi yaptığı, koçun programının yerine geçmesi için onay bekleyen programlar (tablo yoksa boş)
  const { data: programs } = await (supabase as any)
    .from('student_programs')
    .select('id, week_start, week_end, tasks, note, created_at, students(id, full_name)')
    .eq('coach_id', user.id)
    .eq('status', 'bekliyor')
    .order('created_at', { ascending: true });

  return (
    <>
      {!!programs?.length && <OgrenciProgramOnaylari programs={programs} />}
      {!!data?.length && <PlanTalepleriClient requests={data} />}
    </>
  );
}
