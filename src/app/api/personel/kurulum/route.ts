/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlaceholderEmail } from '@/lib/student-account';
import { SITE_URL } from '@/lib/site';

// Personelin ilk giriş adımları (/hesap-kurulumu):
//   { action: 'password' }          şifre tarayıcıda değiştirildikten sonra "ilk giriş" işareti kalkar
//   { action: 'email', email }      e-posta kaydedilir, hoş geldiniz e-postası (bir kez) gider
//   { action: 'skip' }              e-posta sonraya bırakılır; panelde hatırlatma bildirimi oluşur

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient() as any;

  const { data: p } = await admin.from('profiles').select('id, full_name, role, email, welcome_sent_at').eq('id', user.id).single();
  if (!p || p.role === 'ogrenci' || p.role === 'veli') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  if (body?.action === 'password') {
    await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (body?.action === 'skip') {
    if (!p.email) {
      await admin.from('notifications').insert({
        recipient_id: user.id, kind: 'hesap', title: 'E-posta adresinizi ekleyin ✉️',
        body: 'Duyuruları ve şifre işlemlerini e-postayla alabilmeniz için Hesabım sayfasından e-posta adresinizi ekleyin.',
        link: '/hesap-kurulumu?adim=eposta',
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (body?.action === 'email') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200 || isPlaceholderEmail(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi yazın.' }, { status: 400 });
    }
    const { error } = await admin.from('profiles').update({ email }).eq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Bu hesap için bekleyen "e-posta ekleyin" hatırlatmaları kalkar
    await admin.from('notifications').delete().eq('recipient_id', user.id).eq('link', '/hesap-kurulumu?adim=eposta');

    let sent = false;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && !p.welcome_sent_at) {
      const { data: ap } = await admin.from('teacher_access_profiles').select('status, title, mentor_id').eq('teacher_id', user.id).maybeSingle();
      const name = (p.full_name ?? '').trim() || 'Merhaba';
      const title = ap?.title ? ` (${ap.title})` : '';
      const loginUrl = `${SITE_URL}/giris`;
      const what = ap?.status === 'dorm_supervisor'
        ? 'Öğrenci listesini, denemeleri, program ve günlükleri görebilir; haftalık takip ve konu ilerleyişini düzenleyebilirsiniz.'
        : 'Öğrencilerin bilgilerini, deneme sonuçlarını, haftalık takibini ve konu ilerleyişini görüp düzenleyebilirsiniz.';
      const text = `Merhaba ${name}${title},\n\nKoçDefterim'e hoş geldiniz. Telefon numaranız ve belirlediğiniz şifreyle giriş yapabilirsiniz:\n${loginUrl}\n\n${what} Kendi ajandanızı tutabilir, Mesajlar bölümünden öğrencilerle ve ekip arkadaşlarınızla yazışabilirsiniz.\n\nKolay gelsin,\nKoçDefterim`;
      const html = `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1e3a5f">KoçDefterim'e hoş geldiniz 👋</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Merhaba ${escapeHtml(name + title)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Hesabınız hazır. Telefon numaranız ve belirlediğiniz şifreyle giriş yapabilirsiniz.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${loginUrl}" style="display:inline-block;background:#14b8a6;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:10px">Giriş yap</a>
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563">${escapeHtml(what)} Kendi ajandanızı tutabilir, Mesajlar bölümünden öğrencilerle ve ekip arkadaşlarınızla yazışabilirsiniz.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#4b5563">Kolay gelsin,<br>KoçDefterim</p>
  </div>
</div></body></html>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'KoçDefterim <bilgi@kocdefterim.com.tr>',
          reply_to: process.env.EMAIL_REPLY_TO || 'bilgi@kocdefterim.com.tr',
          to: [email], subject: "KoçDefterim'e hoş geldiniz", html, text,
        }),
      }).catch(() => null);
      sent = !!res?.ok;
      if (sent) await admin.from('profiles').update({ welcome_sent_at: new Date().toISOString() }).eq('id', user.id);
      else console.error('personel hoş geldiniz e-postası gönderilemedi', res?.status);
    }
    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
}
