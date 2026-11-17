/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { initialStudentPassword, phoneKey, studentEmailFromPhone } from '@/lib/student-account';

// Koçun öğrencileri için giriş hesabı oluşturur.
// Body: { studentId: string } veya { all: true } (koçun hesabı olmayan tüm öğrencileri)
//       { studentId, reset: true }: hesabı olan öğrencinin şifresini ilk şifreye döndürür (ilk girişte değiştirmesi istenir)
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (body.reset && body.studentId) {
    // Kullanıcı oturumuyla okunur: koç yalnızca kendi öğrencisini sıfırlayabilir
    const { data: st } = await (supabase as any).from('students')
      .select('id, full_name, phone, birth_date, profile_id, coach_id, responsible_coach_id')
      .eq('id', String(body.studentId)).maybeSingle();
    if (!st || (st.coach_id !== user.id && st.responsible_coach_id !== user.id)) return NextResponse.json({ error: 'Öğrenci bulunamadı' }, { status: 404 });
    if (!st.profile_id) return NextResponse.json({ error: 'Öğrencinin hesabı yok' }, { status: 400 });
    const password = initialStudentPassword(st.phone, st.birth_date);
    if (!password) return NextResponse.json({ error: 'Telefon veya doğum tarihi eksik' }, { status: 400 });
    const { error: pwErr } = await admin.auth.admin.updateUserById(st.profile_id, { password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });
    await (admin as any).from('profiles').update({ must_change_password: true }).eq('id', st.profile_id);
    return NextResponse.json({ ok: true, username: '0' + phoneKey(st.phone), password });
  }

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

  type Result = {
    id: string; name: string; status: 'olusturuldu' | 'baglandi' | 'atlandi';
    reason?: string; username?: string; password?: string;
  };
  const results: Result[] = [];

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
    const username = '0' + phoneKey(s.phone);
    if (createErr || !created.user) {
      if (/already|registered|exists/i.test(createErr?.message ?? '')) {
        results.push(await linkExisting(admin, user.id, s, email, username));
      } else {
        results.push({ id: s.id, name: s.full_name, status: 'atlandi', reason: createErr?.message ?? 'Hesap oluşturulamadı' });
      }
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
    results.push({ id: s.id, name: s.full_name, status: 'olusturuldu', username, password });
  }

  return NextResponse.json({ results });
}

/**
 * Bu telefonla açılmış bir hesap zaten var (çoğunlukla öğrenci siteden kendisi kayıt olmuş, koç da ayrıca eklemiş).
 * Hesap hiçbir öğrenci kaydına bağlı değilse koçun kaydına bağlanır, başvurusu onaylanmış sayılır;
 * öğrenci kayıtta kendi belirlediği şifreyle girer. Başka bir öğrenci kaydına bağlıysa dokunulmaz, nedeni söylenir.
 */
async function linkExisting(admin: any, coachId: string, s: any, email: string, username: string) {
  const base = { id: s.id as string, name: s.full_name as string };
  const { data: prof } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();
  if (!prof) return { ...base, status: 'atlandi' as const, reason: 'Bu telefonla açılmış bir hesap var ama bilgileri bulunamadı; yöneticiye bildirin' };
  if (prof.role !== 'ogrenci') return { ...base, status: 'atlandi' as const, reason: 'Bu telefon öğrenci olmayan bir hesapta kayıtlı' };

  const { data: linked } = await admin.from('students').select('id, full_name, coach_id, platform_only').eq('profile_id', prof.id);
  const others = (linked ?? []) as any[];
  if (others.length) {
    if (others.every((o) => o.platform_only)) {
      return { ...base, status: 'atlandi' as const, reason: 'Öğrenci siteden kendisi "yalnızca platform" seçerek kayıt olmuş. Bu kaydı silin; öğrenciyi Ayarlar > Öğrenci Başvuruları bölümünden kendinize atayın (çalışma geçmişi korunur)' };
    }
    const mine = others.find((o) => o.coach_id === coachId);
    return {
      ...base, status: 'atlandi' as const,
      reason: mine
        ? `Bu telefon başka bir öğrencinizin (${mine.full_name}) hesabında kayıtlı; telefonu kontrol edin`
        : 'Bu telefon başka bir koçun öğrencisinin hesabında kayıtlı; telefonu kontrol edin',
    };
  }

  const { error: linkErr } = await admin.from('students').update({ profile_id: prof.id })
    .eq('id', s.id).eq('coach_id', coachId).is('profile_id', null);
  if (linkErr) return { ...base, status: 'atlandi' as const, reason: linkErr.message };
  await admin.from('profiles').update({ is_approved: true }).eq('id', prof.id);
  await admin.from('student_registrations').update({ status: 'onaylandi', assigned_coach_id: coachId })
    .eq('profile_id', prof.id).in('status', ['admin_bekliyor', 'koc_bekliyor']);
  return {
    ...base, status: 'baglandi' as const, username,
    reason: 'Öğrenci daha önce siteden kendisi kayıt olmuş; hesabı bu kayda bağlandı. Kayıtta kendi belirlediği şifreyle girer; unuttuysa "İlk şifreye sıfırla" deyin',
  };
}
