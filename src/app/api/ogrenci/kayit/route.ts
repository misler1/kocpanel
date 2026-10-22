/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneKey, studentEmailFromPhone } from '@/lib/student-account';

// Herkese açık: öğrenci kendi kendine kayıt olur. Hesap oluşur ama ONAYSIZ başlar (is_approved=false).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const fullName = String(body.fullName ?? '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone ?? '').trim();
  const birthDate = String(body.birthDate ?? '').trim();
  const password = String(body.password ?? '');
  const coachId = body.coachId ? String(body.coachId) : null;

  const key = phoneKey(phone);
  const email = studentEmailFromPhone(phone);
  const year = Number(birthDate.slice(0, 4));
  if (fullName.length < 3 || fullName.length > 80) return bad('Ad soyadı yazın.');
  if (!key || !email) return bad('Telefon numarasını 05XX XXX XX XX biçiminde yazın.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || year < 1960 || year > new Date().getFullYear() - 5) return bad('Doğum tarihi geçersiz.');
  if (password.length < 8) return bad('Şifre en az 8 karakter olmalı.');

  const admin = createAdminClient();

  if (coachId) {
    const { data: coach } = await (admin as any)
      .from('profiles').select('id').eq('id', coachId).eq('role', 'koc').eq('is_approved', true).eq('student_selectable', true).maybeSingle();
    if (!coach) return bad('Seçilen koç bulunamadı.');
  }

  // Koçun zaten eklediği öğrenci ise yeni kayıt açtırma: hesabı koçun toplu oluşturmasıyla gelir.
  const { data: cands } = await (admin as any)
    .from('students').select('id, phone, profile_id').ilike('phone', `%${key.slice(-4)}%`);
  const existing = (cands ?? []).find((s: any) => phoneKey(s.phone) === key);
  if (existing) {
    return NextResponse.json({
      error: existing.profile_id
        ? 'Bu telefonla zaten bir hesap var. Giriş yapmayı deneyin.'
        : 'Bu telefon koçunuz tarafından sisteme eklenmiş. Hesabınız koçunuz tarafından açılır; giriş için koçunuza danışın.',
    }, { status: 409 });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName, role: 'ogrenci' },
  });
  if (createErr || !created.user) {
    const dup = /already|registered|exists/i.test(createErr?.message ?? '');
    return NextResponse.json({ error: dup ? 'Bu telefonla zaten bir hesap var. Giriş yapmayı deneyin.' : (createErr?.message ?? 'Hesap oluşturulamadı.') }, { status: dup ? 409 : 500 });
  }
  const uid = created.user.id;

  const { error: profErr } = await (admin as any).from('profiles').upsert({
    id: uid, full_name: fullName, role: 'ogrenci', phone, email, is_approved: false, is_admin: false, must_change_password: false,
  });
  const { error: regErr } = profErr ? { error: profErr } : await (admin as any).from('student_registrations').insert({
    profile_id: uid, full_name: fullName, phone, birth_date: birthDate,
    requested_coach_id: coachId, assigned_coach_id: null, status: 'admin_bekliyor',
  });
  if (profErr || regErr) {
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: 'Kayıt oluşturulamadı: ' + (profErr ?? regErr)!.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
