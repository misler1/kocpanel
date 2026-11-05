/* eslint-disable @typescript-eslint/no-explicit-any */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPushSecret } from '@/lib/push-server';
import { SITE_URL } from '@/lib/site';

// Koç/öğretmen hesabı onaylanınca veritabanı tetikleyicisi (supabase/staff_approval_welcome.sql → trg_staff_approved)
// burayı çağırır ve "hesabınız onaylandı" e-postası Resend ile gönderilir. Oturum yoktur; istek app_settings'teki
// ortak parolayla doğrulanır. Gövdede yalnızca profil kimliği gelir, ad/e-posta veritabanından okunur.
// Gerekli ortam değişkeni: RESEND_API_KEY. İsteğe bağlı: EMAIL_FROM (ör. "KoçDefterim <bildirim@kocdefterim.com.tr>").

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function POST(request: Request) {
  const secret = await getPushSecret().catch(() => null);
  const given = request.headers.get('x-push-secret') ?? '';
  if (!secret || !sameSecret(given, secret)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY tanımlı değil' });

  const admin = createAdminClient() as any;
  const [{ data: p }, { data: w }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, is_approved').eq('id', id).maybeSingle(),
    admin.from('staff_welcomes').select('sent_at').eq('profile_id', id).maybeSingle(),
  ]);
  // Yalnızca az önce onaylanmış koç/öğretmene gönderilir
  if (!p || !p.is_approved || !['koc', 'ogretmen'].includes(p.role) || !w
      || Date.now() - new Date(w.sent_at).getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ sent: false });
  }

  let email: string | null = p.email ?? null;
  if (!email) {
    const { data } = await admin.auth.admin.getUserById(id);
    email = data?.user?.email ?? null;
  }
  if (!email) return NextResponse.json({ sent: false, reason: 'E-posta adresi yok' });

  const name = (p.full_name ?? '').trim() || 'Hocam';
  const loginUrl = `${SITE_URL}/giris`;
  const text =
    `Merhaba ${name},\n\n` +
    `KoçDefterim hesabınız onaylandı. Artık giriş yapıp panelinizi kullanabilirsiniz:\n${loginUrl}\n\n` +
    `Öğrencilerinizi "Öğrenciler" bölümünden ekleyebilir; haftalık programlarını, deneme sonuçlarını ve ` +
    `görüşmelerini panelden takip edebilirsiniz. Sorularınız için paneldeki Mesajlar bölümünden bize yazabilirsiniz.\n\n` +
    `Kolay gelsin,\nKoçDefterim`;
  const html = `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1e3a5f">Hesabınız onaylandı 🎉</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Merhaba ${escapeHtml(name)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">KoçDefterim hesabınız onaylandı. Artık giriş yapıp panelinizi kullanabilirsiniz.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${loginUrl}" style="display:inline-block;background:#14b8a6;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:10px">Giriş yap</a>
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563">Öğrencilerinizi "Öğrenciler" bölümünden ekleyebilir; haftalık programlarını, deneme sonuçlarını ve görüşmelerini panelden takip edebilirsiniz. Sorularınız için paneldeki Mesajlar bölümünden bize yazabilirsiniz.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#4b5563">Kolay gelsin,<br>KoçDefterim</p>
  </div>
  <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#9ca3af">Bu e-posta KoçDefterim hesabınız onaylandığı için gönderildi.</p>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'KoçDefterim <bildirim@kocdefterim.com.tr>',
      to: [email],
      subject: 'KoçDefterim hesabınız onaylandı',
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error('hesap-onay e-postası gönderilemedi', res.status, await res.text().catch(() => ''));
    return NextResponse.json({ sent: false }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
