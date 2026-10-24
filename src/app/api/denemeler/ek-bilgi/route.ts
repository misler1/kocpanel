/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readPdfTexts } from '@/lib/importers/readPdfTexts';
import { parsePdfWithTemplates } from '@/lib/importers/pdfTemplates';
import { matchStudentName } from '@/lib/matching/matchStudent';

// Daha önce yüklenmiş bir denemeye PDF'ten EKSİK bilgileri ekler:
// konu/kazanım analizi, ders ortalamaları, sıralamalar (ve puan boşsa puan).
// Mevcut doğru/yanlış sonuçlarına ve dolu alanlara dokunmaz.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  let examIds: string[] = [];
  try { examIds = JSON.parse(String(form.get('examIds') ?? '[]')); } catch { /* boş */ }
  if (!file || !examIds.length) return NextResponse.json({ error: 'Dosya veya deneme eksik' }, { status: 400 });

  const parsedText = await readPdfTexts(Buffer.from(await file.arrayBuffer()));
  try {
    const sp = parsedText.spaced || parsedText.text;
    const at = sp.search(/PUAN\s+VE\s+SIRALAMALAR/i);
    console.log('[ek-bilgi] sıralama bölümü (spaced=' + !!parsedText.spaced + '):', JSON.stringify(at >= 0 ? sp.slice(at, at + 420) : 'BULUNAMADI'));
  } catch { /* yoksay */ }
  let parsed;
  try {
    parsed = parsePdfWithTemplates(parsedText.text, parsedText.spaced, parsedText.items);
  } catch {
    return NextResponse.json({ error: 'Bu PDF formatı tanınmadı.' }, { status: 422 });
  }

  const { data: exams, error } = await (supabase as any)
    .from('exams')
    .select('id, student_id, exam_type, tyt_puan, lgs_puan, say_puan, ea_puan, soz_puan, question_results, subject_averages, rankings, students(full_name)')
    .in('id', examIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = Array.from(
    new Map((exams ?? []).map((e: any) => [e.student_id, { id: e.student_id, full_name: e.students?.full_name ?? '' }])).values(),
  ) as { id: string; full_name: string }[];

  const isEmpty = (v: any) => v == null || (Array.isArray(v) ? v.length === 0 : typeof v === 'object' && Object.keys(v).length === 0);

  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const unmatched: string[] = [];
  let alreadyComplete = 0;

  for (const rec of parsed.result.records) {
    const m = matchStudentName(rec.rawName, candidates);
    if (!m.studentId || m.isAmbiguous) { unmatched.push(rec.rawName); continue; }
    // Bir PDF'te hem TYT hem AYT varsa, kaydı sınav türü eşleşen denemeye uygula
    const recType = rec.examType ?? parsed.examType;
    const row = (exams ?? []).find((e: any) => e.student_id === m.studentId && e.exam_type === recType);
    if (!row) { unmatched.push(rec.rawName); continue; }

    const patch: Record<string, unknown> = {};
    if (isEmpty(row.question_results) && rec.questions?.length) patch.question_results = rec.questions;
    if (isEmpty(row.subject_averages) && rec.averages && Object.keys(rec.averages).length) patch.subject_averages = rec.averages;
    if (rec.rankings && Object.keys(rec.rankings).length) {
      // Var olan sıralamaları bozmadan yalnızca eksik anahtarları (katılımcı sayıları dahil) ekle
      const cur: any = row.rankings ?? {};
      const merged: any = { ...rec.rankings, ...cur, katilimci: { ...(rec.rankings.katilimci ?? {}), ...(cur.katilimci ?? {}) } };
      if (Object.keys(merged.katilimci).length === 0) delete merged.katilimci;
      if (JSON.stringify(merged) !== JSON.stringify(cur)) patch.rankings = merged;
    }
    if (rec.puan != null) {
      if (row.exam_type === 'TYT' && row.tyt_puan == null) patch.tyt_puan = rec.puan;
      if (row.exam_type === 'LGS' && row.lgs_puan == null) patch.lgs_puan = rec.puan;
    }
    if (row.exam_type === 'AYT' && rec.puanlar) {
      if (row.say_puan == null && rec.puanlar.say != null) patch.say_puan = rec.puanlar.say;
      if (row.ea_puan == null && rec.puanlar.ea != null) patch.ea_puan = rec.puanlar.ea;
      if (row.soz_puan == null && rec.puanlar.soz != null) patch.soz_puan = rec.puanlar.soz;
    }
    if (Object.keys(patch).length === 0) { alreadyComplete++; continue; }
    updates.push({ id: row.id, patch });
  }

  for (const u of updates) {
    const { error: upErr } = await (supabase as any).from('exams').update(u.patch).eq('id', u.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    updated: updates.length,
    alreadyComplete,
    unmatched,
    patches: updates, // ekran, değişen alanları yerel olarak günceller
    pdfExamName: parsed.result.examName ?? parsed.result.records[0]?.examName ?? null,
  });
}