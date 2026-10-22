/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Koç, öğrencinin haftalık program talebine karar verir. Body: { id, action: 'onayla' | 'reddet' }
// Tüm veri işlemleri KOÇUN oturumuyla yapılır; RLS yalnızca kendi öğrencilerinin kayıtlarına izin verir.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanFields(f: any, forAdd: boolean) {
  const out: Record<string, any> = {};
  if (f?.plan_day !== undefined) {
    const d = Number(f.plan_day);
    if (!Number.isInteger(d) || d < 0 || d > 6) throw new Error('Gün geçersiz');
    out.plan_day = d;
  }
  for (const k of ['start_time', 'end_time'] as const) {
    if (f?.[k] !== undefined) {
      if (f[k] === null || f[k] === '') out[k] = null;
      else if (TIME_RE.test(String(f[k]))) out[k] = String(f[k]);
      else throw new Error('Saat geçersiz');
    }
  }
  if (f?.target_count !== undefined) {
    const t = Number(f.target_count);
    if (!Number.isInteger(t) || t < 0 || t > 2000) throw new Error('Hedef geçersiz');
    out.target_count = t;
  }
  if (forAdd) {
    const subject = String(f?.subject ?? '').trim();
    if (!subject || subject.length > 80) throw new Error('Ders adı geçersiz');
    out.subject = subject;
    out.topic = f?.topic ? String(f.topic).trim().slice(0, 120) : null;
    out.resource_name = f?.resource_name ? String(f.resource_name).trim().slice(0, 120) : null;
    if (out.plan_day === undefined) throw new Error('Gün gerekli');
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');

  const db = supabase as any;
  const { data: req } = await db.from('weekly_plan_requests').select('*').eq('id', id).eq('coach_id', user.id).maybeSingle();
  if (!req) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
  if (req.status !== 'bekliyor') return NextResponse.json({ error: 'Bu talep zaten sonuçlandı' }, { status: 400 });

  const now = new Date().toISOString();

  if (action === 'reddet') {
    await db.from('weekly_plan_requests').update({ status: 'reddedildi', decided_at: now }).eq('id', id);
    return NextResponse.json({ ok: true });
  }
  if (action !== 'onayla') return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });

  // Yeni program talebi: koç programı hazırlayınca "hazırlandı" diye işaretler
  if (req.kind === 'yeni_program') {
    await db.from('weekly_plan_requests').update({ status: 'onaylandi', decided_at: now }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // Düzenleme talebi: değişiklikleri doğrula ve uygula
  try {
    const ops: any[] = Array.isArray(req.payload?.ops) ? req.payload.ops : [];
    if (ops.length === 0 || ops.length > 100) throw new Error('Talepte geçerli değişiklik yok');

    const { data: weekLogs, error: wErr } = await db.from('question_logs')
      .select('id, week_end').eq('student_id', req.student_id).eq('week_start', req.week_start);
    if (wErr) throw new Error(wErr.message);
    const ids = new Set((weekLogs ?? []).map((l: any) => l.id));
    const weekEnd = weekLogs?.[0]?.week_end ?? null;

    // Önce hepsini doğrula (yarım uygulama olmasın)
    const prepared = ops.map((op) => {
      if (op.op === 'update') {
        if (!ids.has(op.log_id)) throw new Error('Talepteki görev bu haftada bulunamadı (program değişmiş olabilir)');
        const fields = cleanFields(op.fields, false);
        if (Object.keys(fields).length === 0) throw new Error('Boş değişiklik');
        return { op: 'update', log_id: op.log_id, fields };
      }
      if (op.op === 'delete') {
        if (!ids.has(op.log_id)) throw new Error('Talepteki görev bu haftada bulunamadı (program değişmiş olabilir)');
        return { op: 'delete', log_id: op.log_id };
      }
      if (op.op === 'add') return { op: 'add', fields: cleanFields(op.fields, true) };
      throw new Error('Bilinmeyen değişiklik');
    });

    for (const p of prepared as any[]) {
      if (p.op === 'update') {
        const { error } = await db.from('question_logs').update(p.fields).eq('id', p.log_id).eq('student_id', req.student_id);
        if (error) throw new Error(error.message);
      } else if (p.op === 'delete') {
        const { error } = await db.from('question_logs').delete().eq('id', p.log_id).eq('student_id', req.student_id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from('question_logs').insert({
          ...p.fields, student_id: req.student_id, coach_id: user.id,
          week_start: req.week_start, week_end: weekEnd, done_count: 0, topic_done_minutes: 0,
        });
        if (error) throw new Error(error.message);
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Değişiklikler uygulanamadı' }, { status: 400 });
  }

  await db.from('weekly_plan_requests').update({ status: 'onaylandi', decided_at: now }).eq('id', id);
  return NextResponse.json({ ok: true });
}
