/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Koçun veliye gönderdiği rapor linkleri. Tüm işlemler koçun oturumuyla yapılır;
// RLS yalnızca öğrencinin koçu / sorumlu koçu için izin verir.

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase: supabase as any, user };
}

export async function GET(request: Request) {
  const { supabase, user } = await session();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const studentId = new URL(request.url).searchParams.get('studentId') ?? '';
  const { data, error } = await supabase.from('parent_report_links')
    .select('id, token, note, expires_at, revoked_at, view_count, last_viewed_at, created_at')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await session();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId ?? '');
  const days = Math.min(90, Math.max(1, Math.floor(Number(body.days) || 14)));
  const note = String(body.note ?? '').trim().slice(0, 1500) || null;

  const token = randomBytes(24).toString('base64url'); // 32 karakter, tahmin edilemez
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  const { data, error } = await supabase.from('parent_report_links')
    .insert({ token, student_id: studentId, created_by: user.id, note, expires_at: expires })
    .select('id, token, note, expires_at, revoked_at, view_count, last_viewed_at, created_at').single();
  if (error) {
    const denied = error.code === '42501' || /row-level security/i.test(error.message);
    return NextResponse.json({ error: denied ? 'Bu öğrenci için link oluşturma yetkiniz yok.' : error.message }, { status: denied ? 403 : 500 });
  }
  return NextResponse.json({ link: data });
}

// Linki iptal et
export async function PATCH(request: Request) {
  const { supabase, user } = await session();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { data, error } = await supabase.from('parent_report_links')
    .update({ revoked_at: new Date().toISOString() }).eq('id', String(body.id ?? '')).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Link bulunamadı' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
