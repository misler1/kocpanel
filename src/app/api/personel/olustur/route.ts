/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneKey, staffEmailFromPhone } from '@/lib/student-account';

// Yönetici, kendi öğrencilerinin bulunduğu kurum için personel hesabı açar (yurt yöneticisi / belletmen).
// Giriş: telefon + başlangıç şifresi; ilk girişte şifre değiştirme ve e-posta adımı zorunlu (/hesap-kurulumu).
// Body: { kurum: string, people: [{ fullName, phone, status: 'dorm_manager' | 'dorm_supervisor', title }] }

type Person = { fullName: string; phone: string; status: 'dorm_manager' | 'dorm_supervisor'; title: string };

const PAGES: Record<Person['status'], string[]> = {
  dorm_manager: ['student_info', 'student_list', 'exams', 'topic_progress', 'weekly_tracking', 'tasks'],
  dorm_supervisor: ['student_list', 'exams', 'topic_progress', 'weekly_tracking'],
};
const ALL_PAGES = ['student_info', 'student_list', 'exams', 'topic_progress', 'weekly_tracking', 'meetings', 'tasks'];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const { data: me } = await (supabase as any).from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: 'Yalnızca yönetici personel hesabı açabilir' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const kurum = typeof body?.kurum === 'string' ? body.kurum.trim() : '';
  const people: Person[] = Array.isArray(body?.people) ? body.people : [];
  if (!kurum) return NextResponse.json({ error: 'Kurum seçin' }, { status: 400 });
  if (!people.length || people.length > 50) return NextResponse.json({ error: 'Personel listesi boş' }, { status: 400 });

  const admin = createAdminClient() as any;
  const results: { name: string; phone: string; status: 'olusturuldu' | 'atlandi'; password?: string; reason?: string }[] = [];

  for (const p of people) {
    const fullName = String(p?.fullName ?? '').trim();
    const phone = String(p?.phone ?? '').trim();
    const status = p?.status === 'dorm_manager' ? 'dorm_manager' : 'dorm_supervisor';
    const title = String(p?.title ?? '').trim().slice(0, 60) || (status === 'dorm_manager' ? 'Yurt yöneticisi' : 'Belletmen');
    const email = staffEmailFromPhone(phone);
    if (!fullName || !email) {
      results.push({ name: fullName || '—', phone, status: 'atlandi', reason: 'Ad ya da telefon eksik/hatalı' });
      continue;
    }
    const password = String(randomInt(100000, 1000000)); // 6 haneli başlangıç şifresi; ilk girişte değiştirilir

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, role: 'ogretmen' },
    });
    if (createErr || !created?.user) {
      const exists = /already|registered|exists/i.test(createErr?.message ?? '');
      results.push({ name: fullName, phone, status: 'atlandi', reason: exists ? 'Bu telefonla zaten bir personel hesabı var' : (createErr?.message ?? 'Hesap oluşturulamadı') });
      continue;
    }
    const uid = created.user.id;

    // Profil: onaylı öğretmen; onay tetikleyicisi hoş geldiniz mesajını ve bildirimi gönderir
    const { error: profErr } = await admin.from('profiles').upsert({
      id: uid, full_name: fullName, role: 'ogretmen', phone: `0${phoneKey(phone)}`, email: null,
      is_approved: true, must_change_password: true,
    });
    const { error: apErr } = profErr ? { error: profErr } : await admin.from('teacher_access_profiles').upsert({
      teacher_id: uid, status, mentor_id: user.id, title, updated_at: new Date().toISOString(),
    });
    const scopes = { [kurum]: { allowedClasses: [], excludedStudentIds: [] } };
    const { error: ppErr } = apErr ? { error: apErr } : await admin.from('teacher_page_permissions').upsert(
      ALL_PAGES.map((page) => ({
        teacher_id: uid, page, enabled: PAGES[status].includes(page),
        allowed_kurums: [kurum], allowed_classes: [], excluded_student_ids: [], scopes,
        updated_at: new Date().toISOString(),
      }))
    );

    if (profErr || apErr || ppErr) {
      await admin.auth.admin.deleteUser(uid); // yarım kalan hesabı temizle
      const msg = (profErr ?? apErr ?? ppErr)!.message;
      results.push({ name: fullName, phone, status: 'atlandi', reason: /check constraint/i.test(msg) ? 'Önce supabase/yurt_personeli.sql çalıştırılmalı' : msg });
      continue;
    }
    results.push({ name: fullName, phone, status: 'olusturuldu', password });
  }

  return NextResponse.json({ results });
}
