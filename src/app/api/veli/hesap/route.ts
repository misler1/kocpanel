/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { initialStudentPassword, parentEmailFromPhone, phoneKey } from '@/lib/student-account';

// Koçun öğrencisine veli hesabı bağlaması. Veli telefonuyla giriş yapar (/giris/veli).
// Aynı telefonla açılmış veli hesabı varsa yeni hesap açılmaz, yalnızca bu öğrenciye bağlanır (kardeşler).
// Başlangıç şifresi: veli telefonunun son 4 hanesi + öğrencinin doğum yılı; ilk girişte değiştirilmesi istenir.

async function coachStudent(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 }) };
  const { data: me } = await (supabase as any).from('profiles').select('role, is_approved').eq('id', user.id).single();
  if (!me || !['koc', 'ogretmen'].includes(me.role) || !me.is_approved) {
    return { error: NextResponse.json({ error: 'Yetkisiz' }, { status: 403 }) };
  }
  const admin = createAdminClient() as any;
  const { data: student } = await admin.from('students')
    .select('id, full_name, birth_date, coach_id, responsible_coach_id').eq('id', studentId).maybeSingle();
  if (!student || (student.coach_id !== user.id && student.responsible_coach_id !== user.id)) {
    return { error: NextResponse.json({ error: 'Öğrenci bulunamadı' }, { status: 404 }) };
  }
  return { admin, student };
}

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get('studentId') ?? '';
  const r = await coachStudent(studentId);
  if (r.error) return r.error;
  const { data } = await r.admin.from('student_parents')
    .select('parent_id, profiles:parent_id(full_name, phone, must_change_password)').eq('student_id', studentId);
  const parents = (data ?? []).map((p: any) => ({
    id: p.parent_id, full_name: p.profiles?.full_name ?? '', phone: p.profiles?.phone ?? '',
    pending: !!p.profiles?.must_change_password,
  }));
  return NextResponse.json({ parents });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId ?? '');
  const fullName = String(body.fullName ?? '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone ?? '').trim();
  const r = await coachStudent(studentId);
  if (r.error) return r.error;
  const { admin, student } = r;

  if (fullName.length < 3 || fullName.length > 80) return NextResponse.json({ error: 'Velinin adını yazın.' }, { status: 400 });
  const email = parentEmailFromPhone(phone);
  if (!email || !phoneKey(phone)) return NextResponse.json({ error: 'Telefonu 05XX XXX XX XX biçiminde yazın.' }, { status: 400 });

  // Bu telefonla veli hesabı zaten var mı?
  const { data: existing } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();
  let parentId: string;
  let password: string | null = null;

  if (existing) {
    if (existing.role !== 'veli') return NextResponse.json({ error: 'Bu telefon başka bir hesapta kullanılıyor.' }, { status: 409 });
    parentId = existing.id;
  } else {
    password = initialStudentPassword(phone, student.birth_date);
    if (!password) return NextResponse.json({ error: 'Öğrencinin doğum tarihi kayıtlı değil; önce öğrenci bilgilerine ekleyin.' }, { status: 400 });
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName, role: 'veli' },
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Hesap oluşturulamadı.' }, { status: 500 });
    }
    parentId = created.user.id;
    const { error: profErr } = await admin.from('profiles').upsert({
      id: parentId, full_name: fullName, role: 'veli', phone, email,
      is_approved: true, is_admin: false, must_change_password: true,
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(parentId);
      return NextResponse.json({ error: 'Hesap oluşturulamadı: ' + profErr.message }, { status: 500 });
    }
  }

  const { error: linkErr } = await admin.from('student_parents')
    .upsert({ student_id: studentId, parent_id: parentId }, { onConflict: 'student_id,parent_id', ignoreDuplicates: true });
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, created: !existing, password });
}

// Velinin bu öğrenciyle bağını kaldırır (hesap silinmez; başka çocuğu olabilir)
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId ?? '');
  const r = await coachStudent(studentId);
  if (r.error) return r.error;
  const { error } = await r.admin.from('student_parents').delete()
    .eq('student_id', studentId).eq('parent_id', String(body.parentId ?? ''));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
