/* eslint-disable @typescript-eslint/no-explicit-any */
import { SITE_URL } from '@/lib/site';
import { isPlaceholderEmail } from '@/lib/student-account';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Yöneticilere (profiles.is_admin) Resend ile e-posta. RESEND_API_KEY yoksa sessizce geçer.
 * admin: service role istemcisi. Telefonla açılan hesapların sahte adreslerine gönderilmez.
 */
export async function notifyAdminsByEmail(admin: any, msg: {
  subject: string; heading: string; lines: string[]; linkPath?: string; linkLabel?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { data: admins } = await admin.from('profiles').select('id, email').eq('is_admin', true);
  const to: string[] = [];
  for (const a of admins ?? []) {
    let email: string | null = a.email ?? null;
    if (!email) {
      const { data } = await admin.auth.admin.getUserById(a.id);
      email = data?.user?.email ?? null;
    }
    if (email && !isPlaceholderEmail(email) && !to.includes(email)) to.push(email);
  }
  if (to.length === 0) return false;

  const link = msg.linkPath ? `${SITE_URL}${msg.linkPath}` : null;
  const text = msg.lines.join('\n') + (link ? `\n\n${link}` : '');
  const html = `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1e3a5f">${escapeHtml(msg.heading)}</h1>
    ${msg.lines.map((l) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.6">${escapeHtml(l)}</p>`).join('\n    ')}
    ${link ? `<p style="margin:24px 0 0;text-align:center"><a href="${link}" style="display:inline-block;background:#14b8a6;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:10px">${escapeHtml(msg.linkLabel ?? 'Panele git')}</a></p>` : ''}
  </div>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'KoçDefterim <bilgi@kocdefterim.com.tr>',
      reply_to: process.env.EMAIL_REPLY_TO || 'bilgi@kocdefterim.com.tr',
      to, subject: msg.subject, html, text,
    }),
  });
  if (!res.ok) console.error('yönetici e-postası gönderilemedi', res.status, await res.text().catch(() => ''));
  return res.ok;
}
