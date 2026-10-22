/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { PlanTalepleriClient } from './PlanTalepleriClient';

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

  if (!data || data.length === 0) return null;
  return <PlanTalepleriClient requests={data} />;
}
