/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from 'crypto';

// "Sadece platformu kullanacağım" diyen öğrenciler: veritabanında her öğrenci kaydı bir koça bağlı olmak zorunda olduğu
// için bu öğrenciler görünmez bir sistem hesabına (profiles.is_system = true) bağlanır. Sistem hesabı hiçbir koçun
// listesinde görünmez, giriş yapamaz, mesaj alamaz; yönetici bu öğrencileri Ayarlar > Öğrenci Başvuruları'nda görür
// ve istediğinde koç atar.

export const PLATFORM_COACH_EMAIL = 'platform@sistem.kocdefterim.com';

/** Sistem hesabının id'si; yoksa oluşturur. admin: service role istemcisi. */
export async function getPlatformCoachId(admin: any): Promise<string> {
  const { data: found } = await admin.from('profiles').select('id').eq('is_system', true).limit(1).maybeSingle();
  if (found?.id) return found.id;

  let uid: string | null = null;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: PLATFORM_COACH_EMAIL,
    password: randomBytes(32).toString('base64url'),
    email_confirm: true,
    user_metadata: { full_name: 'KoçDefterim', role: 'koc' },
  });
  if (created?.user) uid = created.user.id;
  else if (/already|registered|exists/i.test(error?.message ?? '')) {
    // Önceki bir denemede auth kullanıcısı oluşmuş ama profil yazılamamış olabilir
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    uid = list?.users?.find((u: any) => u.email === PLATFORM_COACH_EMAIL)?.id ?? null;
  }
  if (!uid) throw new Error('Platform hesabı oluşturulamadı: ' + (error?.message ?? 'bilinmeyen hata'));

  const { error: pErr } = await admin.from('profiles').upsert({
    id: uid, full_name: 'KoçDefterim', role: 'koc', email: PLATFORM_COACH_EMAIL,
    is_approved: true, is_admin: false, is_system: true, student_selectable: false, must_change_password: false,
  });
  if (pErr) throw new Error('Platform hesabı kaydedilemedi: ' + pErr.message);
  return uid;
}
