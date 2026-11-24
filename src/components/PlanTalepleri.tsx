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
    .select('id, kind, student_id, week_start, payload, note, created_at, students(id, full_name, track, resources)')
    .eq('coach_id', user.id)
    .eq('status', 'bekliyor')
    .order('created_at', { ascending: true });

  // Öğrencinin kendi yaptığı ya da belletmenin hazırladığı, onay bekleyen programlar (tablo yoksa boş)
  const { data: programs } = await (supabase as any)
    .from('student_programs')
    .select('*, students(id, full_name, track, resources)') // prepared_by_name: staff_programs.sql
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
