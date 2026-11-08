/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Yönetici, kendine bağlı kurum personelinin (yurt yöneticisi/belletmen) hesabını yönetir.
// Body: { id, action: 'reset' }  → yeni 6 haneli ilk şifre (ilk girişte yine değiştirilir), yalnızca bir kez gösterilir
//       { id, action: 'delete' } → hesabı tamamen siler
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const { data: me } = await (supabase as any).from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: 'Yalnızca yönetici' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === user.id) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });

  const admin = createAdminClient() as any;
  // Yalnızca bu yöneticiye bağlı kurum personeli (koç ya da öğrenci hesapları buradan değiştirilemez)
  const { data: ap } = await admin.from('teacher_access_profiles').select('status, mentor_id').eq('teacher_id', id).maybeSingle();
  if (!ap || ap.mentor_id !== user.id || !['dorm_manager', 'dorm_supervisor'].includes(ap.status)) {
    return NextResponse.json({ error: 'Bu hesap sizin kurum personeliniz değil' }, { status: 403 });
  }

  if (body?.action === 'reset') {
    const password = String(randomInt(100000, 1000000));
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from('profiles').update({ must_change_password: true }).eq('id', id);
    return NextResponse.json({ password });
  }

  if (body?.action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
}
