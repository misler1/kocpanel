/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { initialStudentPassword, studentEmailFromPhone } from '@/lib/student-account';

// Koçun öğrencileri için giriş hesabı oluşturur.
// Body: { studentId: string } veya { all: true } (koçun hesabı olmayan tüm öğrencileri)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const { data: me } = await (supabase as any)
    .from('profiles').select('role, is_approved').eq('id', user.id).single();
  if (!me || me.role === 'ogrenci' || !me.is_approved) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  // Öğrenci sorgusu kullanıcı oturumuyla (RLS'e tabi) yapılır: koç sadece kendi öğrencilerini görür.
  let q = (supabase as any)
    .from('students')
    .select('id, full_name, phone, birth_date, profile_id, coach_id')
    .eq('coach_id', user.id)
    .is('profile_id', null);
  if (body.studentId) q = q.eq('id', String(body.studentId));
  else if (!body.all) return NextResponse.json({ error: 'studentId veya all gerekli' }, { status: 400 });

  const { data: students, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: { id: string; name: string; status: 'olusturuldu' | 'atlandi'; reason?: string }[] = [];

  for (const s of (students ?? []) as any[]) {
    const email = studentEmailFromPhone(s.phone);
    const password = initialStudentPassword(s.phone, s.birth_date);
    if (!email || !password) {
      results.push({ id: s.id, name: s.full_name, status: 'atlandi', reason: 'Telefon veya doğum tarihi eksik' });
      continue;
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: s.full_name, role: 'ogrenci' },
    });
    if (createErr || !created.user) {
      results.push({ id: s.id, name: s.full_name, status: 'atlandi', reason: createErr?.message ?? 'Hesap oluşturulamadı' });
      continue;
    }

    const uid = created.user.id;
    const { error: profErr } = await (admin as any).from('profiles').upsert({
      id: uid, full_name: s.full_name, role: 'ogrenci', phone: s.phone, email,
      is_approved: true, must_change_password: true,
    });
    // Bağlama: sadece hâlâ bağlanmamış ve bu koça ait öğrenci kaydı güncellenir.
    const { error: linkErr } = profErr ? { error: profErr } : await (admin as any)
      .from('students').update({ profile_id: uid })
      .eq('id', s.id).eq('coach_id', user.id).is('profile_id', null);

    if (profErr || linkErr) {
      await admin.auth.admin.deleteUser(uid); // yarım kalan hesabı temizle
      results.push({ id: s.id, name: s.full_name, status: 'atlandi', reason: (profErr ?? linkErr)!.message });
      continue;
    }
    results.push({ id: s.id, name: s.full_name, status: 'olusturuldu' });
  }

  return NextResponse.json({ results });
}
