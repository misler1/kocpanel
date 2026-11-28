/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSeeStudent } from '@/lib/meeting-photos';

// Öğrenci detayı → "Paylaşılan içerikler": bu öğrenciye son N günde gönderilen içerikler (video/bağlantı)
// ve her birini açıp açmadığı, ne kadar izlediği (supabase/feed_views.sql).
// feed_views tablosu doğrudan okumaya kapalı; burada önce kullanıcının öğrenciyi görebildiği
// (veritabanı izinleriyle) kontrol edilir, sonra yalnızca o öğrencinin kayıtları okunur.

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const studentId = params.get('studentId') ?? '';
  const days = [7, 30, 90].includes(Number(params.get('gun'))) ? Number(params.get('gun')) : 30;
  if (!/^[0-9a-f-]{36}$/.test(studentId)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  if (!(await canSeeStudent(studentId))) return NextResponse.json({ error: 'Bu öğrenciye erişiminiz yok' }, { status: 403 });

  const admin = createAdminClient() as any;
  const [{ data: st }, { data: teachers }] = await Promise.all([
    admin.from('students').select('coach_id, responsible_coach_id, profile_id').eq('id', studentId).maybeSingle(),
    admin.from('student_teachers').select('teacher_id').eq('student_id', studentId),
  ]);
  if (!st) return NextResponse.json({ error: 'Öğrenci bulunamadı' }, { status: 404 });
  // Öğrenciye içerik gönderebilenler: koçu, sorumlu koçu, öğretmenleri (_feed_author_has_student ile aynı)
  const authors = [...new Set([st.coach_id, st.responsible_coach_id, ...(teachers ?? []).map((t: any) => t.teacher_id)].filter(Boolean))];
  if (!authors.length) return NextResponse.json({ days, hasAccount: !!st.profile_id, items: [] });

  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const { data: posts, error } = await admin
    .from('feed_posts')
    .select('id, author_id, url, title, starts_at, ends_at, all_students')
    .eq('audience', 'ogrenciler').eq('kind', 'icerik')
    .in('author_id', authors)
    .lte('starts_at', now.toISOString())
    .order('starts_at', { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Yalnızca bu öğrenciye gidenler (herkese ya da seçilenler arasında bu öğrenci)
  const picked = (posts ?? []).filter((p: any) => !p.all_students).map((p: any) => p.id);
  let pickedForMe = new Set<string>();
  if (picked.length) {
    const { data: fps } = await admin.from('feed_post_students').select('post_id').eq('student_id', studentId).in('post_id', picked);
    pickedForMe = new Set((fps ?? []).map((r: any) => r.post_id));
  }
  const mine = (posts ?? []).filter((p: any) => p.all_students || pickedForMe.has(p.id));

  // Öğrenci her paylaşandan yalnızca en son içeriği görür; daha yenisi gelen içerik artık sayfasında değildir
  const latestOf = new Map<string, string>();
  for (const p of mine) if (!latestOf.has(p.author_id)) latestOf.set(p.author_id, p.id);

  const inRange = mine.filter((p: any) => p.starts_at >= since);
  const ids = inRange.map((p: any) => p.id);
  const [{ data: views }, { data: profs }] = await Promise.all([
    ids.length
      ? admin.from('feed_views').select('post_id, opened_at, last_at, open_count, watched_seconds, duration_seconds, max_percent')
        .eq('student_id', studentId).in('post_id', ids)
      : Promise.resolve({ data: [] }),
    admin.from('profiles').select('id, full_name').in('id', authors),
  ]);
  const viewOf = new Map<string, any>((views ?? []).map((v: any) => [v.post_id, v]));
  const nameOf = new Map<string, string>((profs ?? []).map((p: any) => [p.id, p.full_name]));

  const items = inRange.map((p: any) => {
    const v = viewOf.get(p.id);
    const ended = p.ends_at && new Date(p.ends_at) <= now;
    return {
      id: p.id,
      url: p.url,
      title: p.title,
      startsAt: p.starts_at,
      author: nameOf.get(p.author_id) ?? null,
      // öğrencinin sayfasında hâlâ görünüyor mu
      visible: !ended && latestOf.get(p.author_id) === p.id,
      view: v ? {
        openedAt: v.opened_at, lastAt: v.last_at, openCount: v.open_count,
        watched: v.watched_seconds, duration: v.duration_seconds, percent: v.max_percent,
      } : null,
    };
  });

  return NextResponse.json({ days, hasAccount: !!st.profile_id, items });
}
