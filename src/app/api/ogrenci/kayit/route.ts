/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneKey, studentEmailFromPhone } from '@/lib/student-account';
import { clientIp, looksLikeBot, rateLimit } from '@/lib/spam-guard';
import { getPlatformCoachId } from '@/lib/platform-coach';
import { notifyAdminsByEmail } from '@/lib/admin-email';

// Sistem genelinde bu süre içinde en fazla bu kadar yeni başvuru kabul edilir (bot saldırısına karşı tavan)
const GLOBAL_WINDOW_MIN = 10;
const GLOBAL_MAX = 20;

// Herkese açık: öğrenci kendi kendine kayıt olur.
// coachMode='iletisim': koç öğretmen iletişime geçsin → hesap ONAYSIZ başlar, yöneticiye bildirim + e-posta gider.
// coachMode='platform': sadece platformu kullanacak → hesap hemen açılır, öğrenci kaydı görünmez sistem hesabına bağlanır.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (looksLikeBot(body)) return bad('Kayıt gönderilemedi. Sayfayı yenileyip tekrar deneyin.');
  if (!rateLimit(`kayit:${clientIp(request)}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar deneyin.' }, { status: 429 });
  }

  const fullName = String(body.fullName ?? '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone ?? '').trim();
  const birthDate = String(body.birthDate ?? '').trim();
  const password = String(body.password ?? '');
  const coachId = body.coachId ? String(body.coachId) : null;
  const coachMode = body.coachMode === 'platform' ? 'platform' : body.coachMode === 'iletisim' ? 'iletisim' : null;
  const platform = coachMode === 'platform' && !coachId;

  const key = phoneKey(phone);
  const email = studentEmailFromPhone(phone);
  const year = Number(birthDate.slice(0, 4));
  if (fullName.length < 3 || fullName.length > 80) return bad('Ad soyadı yazın.');
  if (!key || !email) return bad('Telefon numarasını 05XX XXX XX XX biçiminde yazın.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || year < 1960 || year > new Date().getFullYear() - 5) return bad('Doğum tarihi geçersiz.');
  if (password.length < 8) return bad('Şifre en az 8 karakter olmalı.');
  if (!coachMode && !coachId) return bad('Koç öğretmen tercihini seç.');

  const admin = createAdminClient();

  const since = new Date(Date.now() - GLOBAL_WINDOW_MIN * 60 * 1000).toISOString();
  const { count: recentCount } = await (admin as any)
    .from('student_registrations').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if ((recentCount ?? 0) >= GLOBAL_MAX) {
    return NextResponse.json({ error: 'Şu an çok yoğun kayıt var. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 429 });
  }

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

  let platformCoachId: string | null = null;
  if (platform) {
    try { platformCoachId = await getPlatformCoachId(admin); } catch (e) {
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const { error: profErr } = await (admin as any).from('profiles').upsert({
    id: uid, full_name: fullName, role: 'ogrenci', phone, email, is_approved: platform, is_admin: false, must_change_password: false,
  });
  let failErr: { message: string } | null = profErr;
  if (!failErr && platform) {
    const { error } = await (admin as any).from('students').insert({
      coach_id: platformCoachId, responsible_coach_id: null, profile_id: uid, platform_only: true,
      full_name: fullName, phone, birth_date: birthDate,
    });
    failErr = error;
  }
  if (!failErr) {
    const { error } = await (admin as any).from('student_registrations').insert({
      profile_id: uid, full_name: fullName, phone, birth_date: birthDate,
      requested_coach_id: platform ? null : coachId, assigned_coach_id: null,
      status: platform ? 'onaylandi' : 'admin_bekliyor', wants_coach: coachMode ? !platform : null,
      ...(platform ? { admin_decided_at: new Date().toISOString() } : {}),
    });
    failErr = error;
  }
  if (failErr) {
    await (admin as any).from('students').delete().eq('profile_id', uid);
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: 'Kayıt oluşturulamadı: ' + failErr.message }, { status: 500 });
  }

  if (coachMode === 'iletisim') {
    await notifyAdminsByEmail(admin, {
      subject: `Koç öğretmen istiyor: ${fullName}`,
      heading: 'Koç öğretmen iletişime geçsin 📞',
      lines: [
        `${fullName} KoçDefterim'e kaydoldu ve koç öğretmenin kendisiyle iletişime geçmesini istiyor.`,
        `Telefon: ${phone}`,
        `Doğum tarihi: ${birthDate.split('-').reverse().join('.')}`,
        'Başvuruyu Ayarlar > Öğrenci Başvuruları bölümünden onaylayıp koç atayabilirsiniz.',
      ],
      linkPath: '/ayarlar',
      linkLabel: 'Başvuruyu aç',
    }).catch((e) => console.error('koç isteyen öğrenci e-postası gönderilemedi', e));
  }
  return NextResponse.json({ ok: true, platform });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
