/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Hesabımı sil. Body: { confirm: 'Sil' }
// * Koç / öğretmen: giriş hesabı silinir; profil ve koçun öğrencileri bağlı tüm kayıtlarıyla (görüşme, deneme,
//   program, günlük…) veritabanı kuralıyla silinir. Bu öğrencilerin ve yalnızca onlara bağlı velilerin giriş
//   hesapları da silinir.
// * Stajyer: öğrencileri önce rehber öğretmene aktarılır, sonra yalnızca stajyerin hesabı silinir.
// * Öğrenci / veli: yalnızca kendi giriş hesabı silinir; koçtaki öğrenci kaydı kalır.
// Yönetici hesabı buradan silinemez. Silmeyi engelleyen bağlantılar için: supabase/hesap_silme.sql
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (String(body?.confirm ?? '').trim().toLocaleLowerCase('tr') !== 'sil') {
    return NextResponse.json({ error: 'Onay için "Sil" yazın' }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  const { data: me } = await admin.from('profiles').select('id, role, is_admin').eq('id', user.id).maybeSingle();
  if (me?.is_admin) {
    return NextResponse.json({ error: 'Yönetici hesabı buradan silinemez' }, { status: 403 });
  }

  const { data: access } = await admin.from('teacher_access_profiles')
    .select('status, mentor_id').eq('teacher_id', user.id).maybeSingle();
  const isIntern = !!access && access.status !== 'coach' && !!access.mentor_id;
  const isStudentOrParent = me?.role === 'ogrenci' || me?.role === 'veli';

  // Silinecek öğrencilerin ve velilerinin giriş hesapları (koç / öğretmen silerken)
  let studentProfileIds: string[] = [];
  let parentIds: string[] = [];
  if (isIntern) {
    const { error } = await admin.from('students').update({ coach_id: access.mentor_id }).eq('coach_id', user.id);
    if (error) return NextResponse.json({ error: 'Öğrenciler rehber öğretmene aktarılamadı: ' + error.message }, { status: 500 });
  } else if (!isStudentOrParent) {
    const { data: students } = await admin.from('students').select('id, profile_id').eq('coach_id', user.id).limit(10000);
    const ids = ((students ?? []) as any[]).map((s) => s.id);
    studentProfileIds = ((students ?? []) as any[]).map((s) => s.profile_id).filter(Boolean);
    if (ids.length) {
      const { data: parents } = await admin.from('student_parents').select('parent_id').in('student_id', ids);
      parentIds = [...new Set<string>(((parents ?? []) as any[]).map((p) => p.parent_id).filter(Boolean))];
    }
  }

  // Asıl silme: giriş hesabı → profil → (koçsa) öğrenciler ve kayıtları, tek işlemde
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({
      error: 'Hesap silinemedi: ' + delErr.message + ' (Yönetici: supabase/hesap_silme.sql çalıştırılmış olmalı.)',
    }, { status: 500 });
  }

  // Öğrenci ve veli giriş hesapları: başka bir öğrenci kaydına bağlı değilse silinir
  const leftovers: string[] = [];
  for (const pid of [...new Set(studentProfileIds)]) {
    if (pid === user.id) continue;
    const { count } = await admin.from('students').select('id', { count: 'exact', head: true }).eq('profile_id', pid);
    if (count) continue;
    const { error } = await admin.auth.admin.deleteUser(pid);
    if (error) leftovers.push(pid);
  }
  for (const pid of parentIds) {
    if (pid === user.id) continue;
    const [{ count }, { data: prof }] = await Promise.all([
      admin.from('student_parents').select('student_id', { count: 'exact', head: true }).eq('parent_id', pid),
      admin.from('profiles').select('role').eq('id', pid).maybeSingle(),
    ]);
    if (count || prof?.role !== 'veli') continue;
    const { error } = await admin.auth.admin.deleteUser(pid);
    if (error) leftovers.push(pid);
  }
  if (leftovers.length) console.error('Hesap silme: silinemeyen bağlı hesaplar', leftovers.length);

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
