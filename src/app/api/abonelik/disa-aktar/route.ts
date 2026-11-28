/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

// Abonelik sayfası → "Verilerimi indir": koçun görebildiği (veritabanı izinleriyle) bütün öğrencileri ve
// kayıtları tek Excel dosyasında. Süre dolduktan sonraki görüntüleme süresinde de çalışır; hesap kapanınca çalışmaz.

const PAGE = 1000;
const MAX_CELL = 32000; // Excel hücre sınırı 32767

async function fetchAll(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await q().range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

async function byStudents(supabase: any, table: string, select: string, ids: string[], order: string) {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    out.push(...await fetchAll(() => supabase.from(table).select(select).in('student_id', chunk).order(order)));
  }
  return out;
}

const cell = (v: unknown) => {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : v;
  return typeof s === 'string' && s.length > MAX_CELL ? `${s.slice(0, MAX_CELL)}…` : s;
};
const html = (s: unknown) => (typeof s === 'string' ? s.replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : s);

function sheet(rows: any[], nameOf: Map<string, string>) {
  return XLSX.utils.json_to_sheet(rows.map((r) => {
    const o: Record<string, unknown> = {};
    if (r.student_id) o['öğrenci'] = nameOf.get(r.student_id) ?? '';
    for (const [k, v] of Object.entries(r)) o[k] = cell(k === 'notes' ? html(v) : v);
    return o;
  }));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const { data: billing } = await (supabase as any).rpc('my_billing');
  if (billing?.state === 'locked') return NextResponse.json({ error: 'Hesabınız kapandı' }, { status: 403 });

  const students = await fetchAll(() => (supabase as any).from('students').select('*').order('full_name'));
  const ids = students.map((s) => s.id);
  const nameOf = new Map<string, string>(students.map((s) => [s.id, s.full_name]));

  const [meetings, exams, tasks, logs, topics] = await Promise.all([
    byStudents(supabase, 'meetings', 'id, student_id, scheduled_at, meeting_type, topic, notes, duration_minutes, created_by_other_name, created_at', ids, 'scheduled_at'),
    byStudents(supabase, 'exams', 'id, student_id, exam_name, exam_date, exam_type, net_score, max_score, subject_results, tyt_puan, lgs_puan, say_puan, ea_puan, soz_puan, rankings, created_at', ids, 'exam_date'),
    byStudents(supabase, 'question_logs', '*', ids, 'week_start'),
    byStudents(supabase, 'daily_logs', '*', ids, 'log_date'),
    byStudents(supabase, 'topic_progress', '*', ids, 'subject'),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(students.map(({ id, ...rest }) => ({ id, ...rest })), new Map()), 'Öğrenciler');
  XLSX.utils.book_append_sheet(wb, sheet(meetings, nameOf), 'Görüşmeler');
  XLSX.utils.book_append_sheet(wb, sheet(exams, nameOf), 'Denemeler');
  XLSX.utils.book_append_sheet(wb, sheet(tasks, nameOf), 'Program görevleri');
  XLSX.utils.book_append_sheet(wb, sheet(logs, nameOf), 'Günlük kayıtları');
  XLSX.utils.book_append_sheet(wb, sheet(topics, nameOf), 'Konu ilerleyişi');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="kocdefterim-verilerim-${day}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
