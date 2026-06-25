'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft } from '@tabler/icons-react';
import { SubjectRow } from '../SubjectRow';
import {
  TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS,
  calcNetYKS, calcNetLGS,
  emptyResult, type ResultMap, type SubjectDef,
} from '../examConstants';

type ExamType = 'TYT' | 'AYT' | 'LGS';

function initResults(subjects: SubjectDef[]): ResultMap {
  return Object.fromEntries(subjects.map((s) => [s.key, emptyResult()]));
}

function calcTotalNet(subjects: SubjectDef[], results: ResultMap, fn: 'yks' | 'lgs'): number {
  let total = 0;
  const seen = new Set<string>();
  for (const s of subjects) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    const r = results[s.key];
    if (!r) continue;
    const d = Number(r.dogru) || 0;
    const y = Number(r.yanlis) || 0;
    total += fn === 'yks' ? calcNetYKS(d, y) : calcNetLGS(d, y);
  }
  return Math.round(total * 100) / 100;
}

function matGeoUsed(results: ResultMap): number {
  const md = Number(results['matematik']?.dogru) || 0;
  const my = Number(results['matematik']?.yanlis) || 0;
  const gd = Number(results['geometri']?.dogru) || 0;
  const gy = Number(results['geometri']?.yanlis) || 0;
  return md + my + gd + gy;
}

function YeniDenemeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [students, setStudents] = useState<{ id: string; full_name: string; track: string }[]>([]);
  const [studentId, setStudentId] = useState(searchParams.get('ogrenci') ?? '');
  const [examType, setExamType] = useState<ExamType>('TYT');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisNotes, setAnalysisNotes] = useState('');

  // TYT sonuçları
  const [tytResults, setTytResults] = useState<ResultMap>(initResults(TYT_SUBJECTS));
  // AYT sonuçları
  const [aytResults, setAytResults] = useState<ResultMap>(initResults(AYT_SUBJECTS));
  // LGS sonuçları
  const [lgsResults, setLgsResults] = useState<ResultMap>(initResults(LGS_SUBJECTS));

  // TYT+AYT bağlama: hangi TYT denemeleri var
  const [linkedTytId, setLinkedTytId] = useState<string>('');
  const [existingTyt, setExistingTyt] = useState<{ id: string; exam_name: string; exam_date: string }[]>([]);

  // Puan alanları
  const [tytPuan, setTytPuan] = useState('');
  const [sayPuan, setSayPuan] = useState('');
  const [eaPuan, setEaPuan] = useState('');
  const [sozPuan, setSozPuan] = useState('');
  const [lgsPuan, setLgsPuan] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('students').select('id, full_name, track')
        .eq('coach_id', user.id).neq('status', 'pasif').order('full_name');
      setStudents(data ?? []);
      const firstId = searchParams.get('ogrenci') ?? data?.[0]?.id ?? '';
      setStudentId(firstId);
      // track'e göre varsayılan tip
      const s = data?.find((s: { id: string; track: string }) => s.id === firstId);
      if (s?.track === 'LGS') setExamType('LGS');
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Öğrenci değişince track'e göre tip güncelle
  useEffect(() => {
    const s = students.find((s) => s.id === studentId);
    if (s?.track === 'LGS') setExamType('LGS');
    else if (examType === 'LGS') setExamType('TYT');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, students]);

  // AYT seçilince mevcut TYT denemelerini yükle (bağlama için)
  useEffect(() => {
    if (examType !== 'AYT' || !studentId) return;
    async function loadTyt() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('exams').select('id, exam_name, exam_date')
        .eq('student_id', studentId).eq('exam_type', 'TYT')
        .order('exam_date', { ascending: false });
      setExistingTyt(data ?? []);
    }
    loadTyt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examType, studentId]);

  const currentStudent = students.find((s) => s.id === studentId);
  const isLgs = currentStudent?.track === 'LGS';

  const tytNet = calcTotalNet(TYT_SUBJECTS, tytResults, 'yks');
  const aytNet = calcTotalNet(AYT_SUBJECTS, aytResults, 'yks');
  const lgsNet = calcTotalNet(LGS_SUBJECTS, lgsResults, 'lgs');

  const tytMatGeo = matGeoUsed(tytResults);
  const aytMatGeo = matGeoUsed(aytResults);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/giris'); return; }

    const subjectResults = examType === 'TYT' ? tytResults
      : examType === 'AYT' ? aytResults
      : lgsResults;

    const totalNet = examType === 'TYT' ? tytNet
      : examType === 'AYT' ? aytNet
      : lgsNet;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('exams').insert({
      student_id: studentId,
      exam_name: examName.trim(),
      exam_date: examDate,
      exam_type: examType,
      net_score: totalNet,
      max_score: examType === 'TYT' ? 120 : examType === 'AYT' ? 160 : 90,
      subject_results: subjectResults,
      linked_exam_id: examType === 'AYT' && linkedTytId ? linkedTytId : null,
      analysis_done: analysisDone,
      analysis_notes: analysisNotes.trim() || null,
      tyt_puan: examType === 'TYT' && tytPuan ? Number(tytPuan) : null,
      say_puan: examType === 'AYT' && sayPuan ? Number(sayPuan) : null,
      ea_puan: examType === 'AYT' && eaPuan ? Number(eaPuan) : null,
      soz_puan: examType === 'AYT' && sozPuan ? Number(sozPuan) : null,
      lgs_puan: examType === 'LGS' && lgsPuan ? Number(lgsPuan) : null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/denemeler');
    router.refresh();
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/denemeler" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="text-[18px] font-medium text-gray-900">Deneme sonucu gir</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Temel bilgiler ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Öğrenci <span className="text-red-500">*</span></label>
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls}>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deneme adı <span className="text-red-500">*</span></label>
              <input type="text" required value={examName} onChange={(e) => setExamName(e.target.value)}
                placeholder="Dijital TYT 5, Benim Hocam AYT..." className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tarih</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deneme türü</label>
              <div className="flex gap-2">
                {(isLgs ? ['LGS'] : ['TYT', 'AYT']).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setExamType(t as ExamType)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                      examType === t
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AYT → TYT bağlama */}
          {examType === 'AYT' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bu AYT&apos;yi bir TYT&apos;ye bağla <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
              </label>
              <select value={linkedTytId} onChange={(e) => setLinkedTytId(e.target.value)} className={inputCls}>
                <option value="">— Bağlama</option>
                {existingTyt.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.exam_name} · {new Date(t.exam_date).toLocaleDateString('tr-TR')}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-400">Bağlarsanız deneme listesinde birlikte gösterilir ve kombine net hesaplanır.</p>
            </div>
          )}
        </div>

        {/* ── TYT Dersleri ── */}
        {examType === 'TYT' && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">TYT Dersleri</h2>
              <span className="text-[13px] font-semibold text-blue-700">Toplam Net: {tytNet}</span>
            </div>
            <p className="mb-4 text-[11px] text-gray-400">4 yanlış = 1 doğru götürür · Mat+Geo toplam 40 soru</p>
            <div className="space-y-2">
              {TYT_SUBJECTS.map((s) => {
                const warn = s.optional && tytMatGeo > 40
                  ? `Mat+Geo: ${tytMatGeo}/40 aşıldı!` : undefined;
                return (
                  <SubjectRow
                    key={s.key}
                    label={s.label}
                    total={s.optional ? 40 - (s.key === 'matematik'
                      ? (Number(tytResults['geometri']?.dogru) || 0) + (Number(tytResults['geometri']?.yanlis) || 0)
                      : (Number(tytResults['matematik']?.dogru) || 0) + (Number(tytResults['matematik']?.yanlis) || 0))
                      : s.total}
                    value={tytResults[s.key]}
                    onChange={(v) => setTytResults((prev) => ({ ...prev, [s.key]: v }))}
                    calcFn="yks"
                    warn={warn}
                  />
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center">
              <span className="text-[13px] text-blue-700">Toplam Net: </span>
              <span className="text-[20px] font-bold text-blue-700">{tytNet}</span>
              <span className="text-[13px] text-blue-500"> / 120</span>
            </div>
          </div>
        )}

        {/* ── AYT Dersleri ── */}
        {examType === 'AYT' && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">AYT Dersleri</h2>
              <span className="text-[13px] font-semibold text-blue-700">Toplam Net: {aytNet}</span>
            </div>
            <p className="mb-4 text-[11px] text-gray-400">4 yanlış = 1 doğru götürür · Mat+Geo toplam 40 soru</p>
            <div className="space-y-2">
              {AYT_SUBJECTS.map((s) => {
                const warn = s.optional && aytMatGeo > 40
                  ? `Mat+Geo: ${aytMatGeo}/40 aşıldı!` : undefined;
                return (
                  <SubjectRow
                    key={s.key}
                    label={s.label}
                    total={s.optional ? 40 - (s.key === 'matematik'
                      ? (Number(aytResults['geometri']?.dogru) || 0) + (Number(aytResults['geometri']?.yanlis) || 0)
                      : (Number(aytResults['matematik']?.dogru) || 0) + (Number(aytResults['matematik']?.yanlis) || 0))
                      : s.total}
                    value={aytResults[s.key]}
                    onChange={(v) => setAytResults((prev) => ({ ...prev, [s.key]: v }))}
                    calcFn="yks"
                    warn={warn}
                  />
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center">
              <span className="text-[13px] text-blue-700">Toplam Net: </span>
              <span className="text-[20px] font-bold text-blue-700">{aytNet}</span>
              <span className="text-[13px] text-blue-500"> / 160</span>
            </div>
          </div>
        )}

        {/* ── LGS Dersleri ── */}
        {examType === 'LGS' && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">LGS Dersleri</h2>
            </div>
            <p className="mb-4 text-[11px] text-gray-400">3 yanlış = 1 doğru götürür</p>
            <div className="space-y-2">
              {LGS_SUBJECTS.map((s) => (
                <SubjectRow
                  key={s.key}
                  label={s.label}
                  total={s.total}
                  value={lgsResults[s.key]}
                  onChange={(v) => setLgsResults((prev) => ({ ...prev, [s.key]: v }))}
                  calcFn="lgs"
                />
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center">
              <span className="text-[13px] text-blue-700">Toplam Net: </span>
              <span className="text-[20px] font-bold text-blue-700">{lgsNet}</span>
              <span className="text-[13px] text-blue-500"> / 90</span>
            </div>
          </div>
        )}

        {/* ── Puan girişi ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Puan</h2>
          <p className="text-[11px] text-gray-400">Sistemin hesapladığı puanı girin (isteğe bağlı)</p>
          {examType === 'TYT' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">TYT Puanı</label>
              <input type="number" step="0.01" value={tytPuan} onChange={(e) => setTytPuan(e.target.value)}
                placeholder="örn: 312.500" className={inputCls} />
            </div>
          )}
          {examType === 'AYT' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sayısal Puanı</label>
                <input type="number" step="0.01" value={sayPuan} onChange={(e) => setSayPuan(e.target.value)}
                  placeholder="örn: 450.200" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Eşit Ağırlık Puanı</label>
                <input type="number" step="0.01" value={eaPuan} onChange={(e) => setEaPuan(e.target.value)}
                  placeholder="örn: 380.100" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sözel Puanı</label>
                <input type="number" step="0.01" value={sozPuan} onChange={(e) => setSozPuan(e.target.value)}
                  placeholder="örn: 350.000" className={inputCls} />
              </div>
            </div>
          )}
          {examType === 'LGS' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">LGS Puanı</label>
              <input type="number" step="0.01" value={lgsPuan} onChange={(e) => setLgsPuan(e.target.value)}
                placeholder="örn: 498.750" className={inputCls} />
            </div>
          )}
        </div>

        {/* ── Analiz ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={analysisDone} onChange={(e) => setAnalysisDone(e.target.checked)}
              className="h-4 w-4 accent-blue-600" />
            <span className="text-sm font-medium text-gray-700">Analiz yapıldı</span>
          </label>
          {analysisDone && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Analiz notları</label>
              <textarea value={analysisNotes} onChange={(e) => setAnalysisNotes(e.target.value)}
                rows={3} placeholder="Zayıf konular, gelişim alanları..."
                className={inputCls} />
            </div>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Link href="/denemeler" className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm text-gray-600 hover:bg-gray-50">
            İptal
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function YeniDenemePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Yükleniyor...</div>}>
      <YeniDenemeForm />
    </Suspense>
  );
}
