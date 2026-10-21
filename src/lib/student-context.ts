/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Öğrenci sayfalarının ortak girişi: oturum + öğrenci kaydı + ilk giriş şifre kontrolü.
// Öğrenci kaydı yalnızca profile_id = giriş yapan kullanıcı olan satırdır (başka öğrenci görülemez).
export async function getStudentContext(opts: { allowPasswordChange?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris/ogrenci');

  const { data: profile } = await (supabase as any)
    .from('profiles').select('id, full_name, role, must_change_password').eq('id', user.id).single();
  if (!profile || profile.role !== 'ogrenci') redirect('/anasayfa');
  if (profile.must_change_password && !opts.allowPasswordChange) redirect('/ogrenci/sifre-degistir');

  const { data: student } = await (supabase as any)
    .from('students').select('*').eq('profile_id', user.id).maybeSingle();

  return { supabase, user, profile, student: student as any | null };
}
