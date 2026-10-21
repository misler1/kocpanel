/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Başvuru kararları. Body: { id, action: 'onayla' | 'reddet' | 'koc_ata', coachId? }
// Yetki kullanıcı oturumundan okunur: admin (aşama 1 + koç atama) veya başvuruda atanmış koç (aşama 2).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');
  const coachId = body.coachId ? String(body.coachId) : null;

  const admin = createAdminClient();
  const { data: me } = await (admin as any)
    .from('profiles').select('role, is_admin, is_approved').eq('id', user.id).single();
  if (!me?.is_approved || me.role === 'ogrenci') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const { data: reg } = await (admin as any).from('student_registrations').select('*').eq('id', id).maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });

  const isAdmin = !!me.is_admin;
  const isAssignedCoach = reg.assigned_coach_id === user.id;
  const now = new Date().toISOString();

  async function validCoach(cid: string | null) {
    if (!cid) return false;
    const { data } = await (admin as any).from('profiles').select('id')
      .eq('id', cid).eq('role', 'koc').eq('is_approved', true).maybeSingle();
    return !!data;
  }

  // Öğrenci kaydını (students) oluşturur ve hesabı onaylar.
  async function finalize(coach: string | null, patch: Record<string, any>) {
    if (coach) {
      const { data: has } = await (admin as any).from('students').select('id').eq('profile_id', reg.profile_id).maybeSingle();
      if (!has) {
        const { error } = await (admin as any).from('students').insert({
          coach_id: coach, responsible_coach_id: coach, profile_id: reg.profile_id,
          full_name: reg.full_name, phone: reg.phone, birth_date: reg.birth_date,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    const { error: pErr } = await (admin as any).from('profiles').update({ is_approved: true }).eq('id', reg.profile_id);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    await (admin as any).from('student_registrations').update({ status: 'onaylandi', ...patch }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reddet') {
    const canReject = (isAdmin && reg.status !== 'reddedildi') || (isAssignedCoach && reg.status === 'koc_bekliyor');
    if (!canReject) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    await (admin as any).from('student_registrations').update({
      status: 'reddedildi', ...(isAdmin ? { admin_decided_at: now } : { coach_decided_at: now }),
    }).eq('id', id);
    await (admin as any).from('profiles').update({ is_approved: false }).eq('id', reg.profile_id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'onayla') {
    // Aşama 1: admin
    if (reg.status === 'admin_bekliyor') {
      if (!isAdmin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
      if (reg.requested_coach_id) {
        // Öğrenci koç seçmişti: şimdi o koçun onayına gider
        if (!(await validCoach(reg.requested_coach_id))) return NextResponse.json({ error: 'Seçilen koç artık geçerli değil; koç atayın.' }, { status: 400 });
        await (admin as any).from('student_registrations').update({
          status: 'koc_bekliyor', assigned_coach_id: reg.requested_coach_id, admin_decided_at: now,
        }).eq('id', id);
        return NextResponse.json({ ok: true });
      }
      // Koç seçilmemişti: admin onaylar, isterse koç atar
      if (coachId && !(await validCoach(coachId))) return NextResponse.json({ error: 'Koç geçersiz.' }, { status: 400 });
      return finalize(coachId, { admin_decided_at: now, assigned_coach_id: coachId });
    }
    // Aşama 2: atanmış koç
    if (reg.status === 'koc_bekliyor') {
      if (!isAssignedCoach) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
      return finalize(user.id, { coach_decided_at: now });
    }
    return NextResponse.json({ error: 'Bu başvuru onaylanamaz durumda.' }, { status: 400 });
  }

  // Sonradan koç atama (onaylı ama koçsuz öğrenci)
  if (action === 'koc_ata') {
    if (!isAdmin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    if (reg.status !== 'onaylandi' || reg.assigned_coach_id) return NextResponse.json({ error: 'Bu öğrencinin koçu zaten var.' }, { status: 400 });
    if (!(await validCoach(coachId))) return NextResponse.json({ error: 'Koç geçersiz.' }, { status: 400 });
    return finalize(coachId, { assigned_coach_id: coachId });
  }

  return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
}
