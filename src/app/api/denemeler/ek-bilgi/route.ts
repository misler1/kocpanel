/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readPdfTexts } from '@/lib/importers/readPdfTexts';
import { parsePdfWithTemplates } from '@/lib/importers/pdfTemplates';
import { matchStudentName } from '@/lib/matching/matchStudent';
import { getUploadCandidates } from '@/lib/matching/uploadCandidates';
import { calcExamNet } from '@/app/denemeler/examConstants';

const EXAM_SELECT =
  '*, students(full_name, track, kurum, donem, sinif_sube, coach_id, responsible_coach_id, responsible_coach_other_name), linked:linked_exam_id(exam_name, net_score, exam_type)';

// Daha önce yüklenmiş bir denemeye PDF'ten EKSİK bilgileri ekler:
// konu/kazanım analizi, ders ortalamaları, sıralamalar (ve puan boşsa puan).
// Mevcut doğru/yanlış sonuçlarına ve dolu alanlara dokunmaz.
// Denemede kaydı olmayan öğrenci (ilk yüklemede eşleşmemiş, ör. stajyerin öğrencisi) elle seçilirse
// o öğrenciye PDF'teki sonuçlarla yeni deneme kaydı oluşturulur.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  let examIds: string[] = [];
  try { examIds = JSON.parse(String(form.get('examIds') ?? '[]')); } catch { /* boş */ }
  // Elle eşleştirme: PDF'teki ad → öğrenci id
  let manual: Record<string, string> = {};
  try { manual = JSON.parse(String(form.get('manual') ?? '{}')) ?? {}; } catch { /* boş */ }
  if (!file || !examIds.length) return NextResponse.json({ error: 'Dosya veya deneme eksik' }, { status: 400 });

  const parsedText = await readPdfTexts(Buffer.from(await file.arrayBuffer()));
  let parsed;
  try {
    parsed = parsePdfWithTemplates(parsedText.text, parsedText.spaced, parsedText.items, parsedText.rects);
  } catch {
    return NextResponse.json({ error: 'Bu PDF formatı tanınmadı.' }, { status: 422 });
  }

  const { data: exams, error } = await (supabase as any)
    .from('exams')
    .select('id, student_id, exam_type, exam_name, exam_date, tyt_puan, lgs_puan, say_puan, ea_puan, soz_puan, question_results, subject_averages, rankings, students(full_name)')
    .in('id', examIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const group: any = (exams ?? [])[0];
  if (!group) return NextResponse.json({ error: 'Deneme bulunamadı' }, { status: 404 });

  // Önce bu denemede kaydı olan öğrencilerle eşleştir; olmazsa tüm öğrencilerden (stajyerlerinkiler dahil) öneri
  const inExam = Array.from(
    new Map((exams ?? []).map((e: any) => [e.student_id, { id: e.student_id, full_name: e.students?.full_name ?? '' }])).values(),
  ) as { id: string; full_name: string }[];
  const all = await getUploadCandidates(supabase, user.id);
  for (const c of inExam) if (!all.some((a) => a.id === c.id)) all.push(c);

  const isEmpty = (v: any) => v == null || (Array.isArray(v) ? v.length === 0 : typeof v === 'object' && Object.keys(v).length === 0);

  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const inserts: Record<string, unknown>[] = [];
  const unmatched: { rawName: string; suggestId: string | null }[] = [];
  const matchedStudents = new Set<string>();
  let alreadyComplete = 0;
  let kazanimAdded = 0;

  for (const rec of parsed.result.records) {
    const recType = rec.examType ?? parsed.examType;
    let studentId: string | null = null;
    const manualId = manual[rec.rawName];
    if (manualId && all.some((c) => c.id === manualId)) studentId = manualId;
    else {
      const m = matchStudentName(rec.rawName, inExam);
      if (m.studentId && !m.isAmbiguous) studentId = m.studentId;
    }
    if (!studentId) {
      const g = matchStudentName(rec.rawName, all);
      const best = g.alternatives?.[0];
      unmatched.push({ rawName: rec.rawName, suggestId: best && best.score >= 0.6 ? best.id : null });
      continue;
    }
    if (matchedStudents.has(studentId)) { unmatched.push({ rawName: rec.rawName, suggestId: null }); continue; } // aynı öğrenci iki ada
    matchedStudents.add(studentId);

    // Bir PDF'te hem TYT hem AYT varsa, kaydı sınav türü eşleşen denemeye uygula
    const row = (exams ?? []).find((e: any) => e.student_id === studentId && e.exam_type === recType);
    if (!row) {
      // Bu denemede kaydı yok (yalnızca elle seçilenler buraya gelir): yeni deneme kaydı
      if (recType !== group.exam_type) { unmatched.push({ rawName: rec.rawName, suggestId: null }); continue; }
      const t = group.exam_type as string;
      inserts.push({
        student_id: studentId,
        exam_name: group.exam_name,
        exam_date: group.exam_date,
        exam_type: t,
        net_score: calcExamNet(t, rec.results),
        max_score: t === 'TYT' ? 120 : t === 'AYT' ? 160 : 90,
        subject_results: rec.results,
        tyt_puan: t === 'TYT' ? rec.puan ?? null : null,
        lgs_puan: t === 'LGS' ? rec.puan ?? null : null,
        ...(t === 'AYT' && rec.puanlar ? { say_puan: rec.puanlar.say ?? null, ea_puan: rec.puanlar.ea ?? null, soz_puan: rec.puanlar.soz ?? null } : {}),
        analysis_done: false,
        ...(rec.questions?.length ? { question_results: rec.questions } : {}),
        ...(rec.averages && Object.keys(rec.averages).length ? { subject_averages: rec.averages } : {}),
        ...(rec.rankings && Object.keys(rec.rankings).length ? { rankings: rec.rankings } : {}),
      });
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (isEmpty(row.question_results) && rec.questions?.length) {
      patch.question_results = rec.questions;
      if (rec.questions.some((q) => q.ks)) kazanimAdded++;
    }
    else if (Array.isArray(row.question_results)) {
      // Eksik olan kısım ders ders eklenir: o derste kazanım özeti (ks) yoksa ks, soru soru cevap yoksa cevaplar
      const cur: any[] = row.question_results;
      const ksSubj = new Set(cur.filter((q) => q?.ks).map((q) => q.s));
      const ansSubj = new Set(cur.filter((q) => q && !q.ks).map((q) => q.s));
      const addKs = (rec.questions ?? []).filter((q) => q.ks && !ksSubj.has(q.s));
      const addAns = (rec.questions ?? []).filter((q) => !q.ks && !ansSubj.has(q.s));
      if (addKs.length || addAns.length) patch.question_results = [...addAns, ...cur, ...addKs];
      if (addKs.length) kazanimAdded++;
    }
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

  let created: any[] = [];
  if (inserts.length) {
    const { data, error: insErr } = await (supabase as any).from('exams').insert(inserts).select(EXAM_SELECT);
    if (insErr) {
      const perm = /row-level security|permission/i.test(insErr.message);
      return NextResponse.json({
        error: perm
          ? 'Seçilen öğrencilere deneme eklenemedi: bu öğrenciler için yazma izniniz yok (stajyer öğrencileri için supabase/mentor_intern_exams_write.sql çalıştırılmalı).'
          : insErr.message,
        updated: updates.length,
      }, { status: perm ? 403 : 500 });
    }
    created = data ?? [];
  }

  return NextResponse.json({
    updated: updates.length,
    kazanimAdded,
    created,
    alreadyComplete,
    unmatched,
    // elle eşleştirme seçenekleri: henüz eşleşmemiş tüm öğrenciler; bu denemede kaydı olanlar işaretli
    options: all
      .filter((c) => !matchedStudents.has(c.id))
      .map((c) => ({ ...c, inExam: inExam.some((x) => x.id === c.id) }))
      .sort((a, b) => Number(b.inExam) - Number(a.inExam) || a.full_name.localeCompare(b.full_name, 'tr')),
    patches: updates, // ekran, değişen alanları yerel olarak günceller
    pdfExamName: parsed.result.examName ?? parsed.result.records[0]?.examName ?? null,
  });
}
