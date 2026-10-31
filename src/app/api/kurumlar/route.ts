/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Kurum adları students.kurum alanında serbest metin olarak tutulur. Bu uç, aynı kurumun farklı yazımlarını
// birleştirmek / yeniden adlandırmak içindir. Yönetici tüm öğrencilerde, koç yalnızca kendi öğrencilerinde değiştirir.

async function scope() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await (supabase as any).from('profiles').select('role, is_admin, is_approved').eq('id', user.id).single();
  if (!profile || profile.role === 'ogrenci' || !profile.is_approved) return null;
  return { userId: user.id as string, isAdmin: !!profile.is_admin };
}

function scoped(query: any, s: { userId: string; isAdmin: boolean }) {
  return s.isAdmin ? query : query.or(`coach_id.eq.${s.userId},responsible_coach_id.eq.${s.userId}`);
}

export async function GET() {
  const s = await scope();
  if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  const admin = createAdminClient() as any;
  const { data, error } = await scoped(admin.from('students').select('kurum'), s);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  let empty = 0;
  for (const r of data ?? []) {
    const k = (r.kurum ?? '').trim();
    if (!k) { empty++; continue; }
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const kurumlar = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  return NextResponse.json({ kurumlar, empty, isAdmin: s.isAdmin });
}

export async function POST(request: Request) {
  const s = await scope();
  if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const from = String(body.from ?? '').trim();
  const to = String(body.to ?? '').trim().replace(/\s+/g, ' ');
  if (!from) return NextResponse.json({ error: 'Kurum seçin' }, { status: 400 });
  if (!to || to.length > 120) return NextResponse.json({ error: 'Yeni ad 1-120 karakter olmalı' }, { status: 400 });

  const admin = createAdminClient() as any;
  // Baştaki/sondaki boşluk farkıyla kaydedilmiş aynı adlar da yakalansın
  const { data: rows, error: readErr } = await scoped(admin.from('students').select('id, kurum').ilike('kurum', `%${from.replace(/[%_]/g, '\\$&')}%`), s);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  const ids = (rows ?? []).filter((r: any) => (r.kurum ?? '').trim() === from).map((r: any) => r.id);
  if (ids.length === 0) return NextResponse.json({ updated: 0 });

  const { error } = await admin.from('students').update({ kurum: to }).in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}
