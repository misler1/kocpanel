'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconChartBar, IconEdit, IconTrash, IconChevronDown, IconChevronUp, IconArrowsRightLeft, IconX, IconSparkles, IconLoader2 } from '@tabler/icons-react';
import { StudentFilter } from '@/components/StudentFilter';
import { useExamFilter } from '@/lib/exam-filter-context';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS } from './examConstants';

const TYPE_BADGE: Record<string, string> = {
  TYT: 'bg-blue-50 text-blue-700',
  AYT: 'bg-purple-50 text-purple-700',
  LGS: 'bg-teal-50 text-teal-700',
};

function scoreColor(net: number, max: number) {
  const pct = (net / max) * 100;
  if (pct >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (pct >= 45) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { bar: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' };
}

function getSubjectNet(result: any, examType: string): number {
  if (!result) return 0;
  const d = Number(result.dogru) || 0;
  const y = Number(result.yanlis) || 0;
  return examType === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y);
}

function SubjectResults({ subjectResults, examType }: { subjectResults: any; examType: string }) {
  const subjects = examType === 'TYT' ? TYT_SUBJECTS : examType === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
  const maxNet = examType === 'TYT' ? 120 : examType === 'AYT' ? 160 : 90;

  if (!subjectResults) return null;

  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {subjects.map((s) => {
          const result = subjectResults[s.key];
          const net = getSubjectNet(result, examType);
          const d = Number(result?.dogru) || 0;
          const y = Number(result?.yanlis) || 0;
          const pct = (net / s.total) * 100;
          const barColor = pct >= 70 ? 'bg-emerald-400' : pct >= 45 ? 'bg-amber-400' : 'bg-red-400';

          return (
            <div key={s.key} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600 truncate">{s.label}</span>
                <span className="text-[12px] font-bold text-gray-800 ml-1 flex-shrink-0">{net}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>{d}D · {y}Y</span>
                <span>/{s.total}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-right text-[11px] text-gray-400">
        Toplam: {examType === 'TYT' ? '120' : examType === 'AYT' ? '160' : '90'} soru
      </div>
    </div>
  );
}

interface Props {
  initialExams: any[];
  students: any[];
  initialFilter?: string;
}

export function DenemelerClient({ initialExams, students, initialFilter }: Props) {
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [exams, setExams] = useState<any[]>(initialExams);
  const [filter, setFilter] = useState(initialFilter ?? '');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const MAX_COMPARE = 5;

  function toggleCompareSelect(id: string) {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedCompareIds([]);
  }

  const compareExams = exams.filter((e) => selectedCompareIds.includes(e.id));

  const globallyFiltered = exams.filter((e) => matchesFilter(e.students));
  const filtered = filter ? globallyFiltered.filter((e) => e.student_id === filter) : globallyFiltered;

  async function handleToggleAnalysis(exam: any) {
    setTogglingId(exam.id);
    const newValue = !exam.analysis_done;
    const { error } = await (supabase.from('exams') as any)
      .update({ analysis_done: newValue })
      .eq('id', exam.id);
    if (!error) {
      setExams((prev) =>
        prev.map((e) => e.id === exam.id ? { ...e, analysis_done: newValue } : e)
      );
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    await (supabase.from('exams') as any).delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Başlık */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Deneme sonuçları</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{filtered.length} kayıt</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${
              compareMode
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <IconArrowsRightLeft size={15} />
            {compareMode ? 'İptal' : 'Karşılaştır'}
          </button>
          <Link href="/denemeler/yeni"
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100">
            <IconPlus size={15} />
            Deneme gir
          </Link>
        </div>
      </div>

      {/* Filtre */}
      {(() => {
        const filteredStudents = students.filter((s: any) => matchesFilter(s));
        return filteredStudents.length > 0 && (
          <StudentFilter
            students={filteredStudents}
            selectedId={filter}
            onSelect={setFilter}
            showAll
          />
        );
      })()}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-20">
          <IconChartBar size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">Henüz deneme girilmemiş.</p>
          <Link href="/denemeler/yeni" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            İlk denemeyi gir
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e: any) => {
            const colors = scoreColor(e.net_score, e.max_score);
            const pct = Math.round((e.net_score / e.max_score) * 100);
            const date = new Date(e.exam_date).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
            });
            const typeBadge = TYPE_BADGE[e.exam_type] ?? 'bg-gray-100 text-gray-500';
            const linked = e.linked;
            const combineNet = linked && e.exam_type === 'AYT'
              ? Math.round((e.net_score + linked.net_score) * 100) / 100 : null;

            const puanlar = [
              e.tyt_puan && `TYT: ${e.tyt_puan}`,
              e.say_puan && `SAY: ${e.say_puan}`,
              e.ea_puan && `EA: ${e.ea_puan}`,
              e.soz_puan && `SÖZ: ${e.soz_puan}`,
              e.lgs_puan && `LGS: ${e.lgs_puan}`,
            ].filter(Boolean).join(' · ');

            const isToggling = togglingId === e.id;
            const isExpanded = expandedId === e.id;
            const hasSubjectResults = e.subject_results && Object.keys(e.subject_results).length > 0;
            return (
              <div key={e.id} className={`rounded-xl border bg-white overflow-hidden transition ${
                compareMode && selectedCompareIds.includes(e.id) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
              }`}>
                {/* Üst kısım */}
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {compareMode && (
                      <input
                        type="checkbox"
                        checked={selectedCompareIds.includes(e.id)}
                        onChange={() => toggleCompareSelect(e.id)}
                        disabled={!selectedCompareIds.includes(e.id) && selectedCompareIds.length >= MAX_COMPARE}
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-blue-600 disabled:opacity-30"
                      />
                    )}
                    <span className={`mt-0.5 flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeBadge}`}>
                      {e.exam_type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-900">
                        {e.students?.full_name} — {e.exam_name}
                      </div>
                      <div className="text-[12px] text-gray-400">{date}</div>
                      {puanlar && (
                        <div className="mt-0.5 text-[12px] text-gray-500">{puanlar}</div>
                      )}
                      {linked && e.exam_type === 'AYT' && (
                        <div className="mt-0.5 text-[11px] text-purple-600">
                          🔗 {linked.exam_name} · Kombine: {combineNet} net
                        </div>
                      )}
                      {/* İlerleme çubuğu */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Sağ: net + butonlar */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-[16px] font-bold ${colors.text}`}>{e.net_score}</div>
                      <div className="text-[11px] text-gray-400">/{e.max_score} net</div>
                      <div className={`mt-0.5 text-[11px] font-semibold ${colors.text}`}>%{pct}</div>
                      <button
                        onClick={() => handleToggleAnalysis(e)}
                        disabled={isToggling}
                        className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70 disabled:opacity-40 cursor-pointer ${
                          e.analysis_done
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}>
                        {isToggling ? '...' : e.analysis_done ? 'Analiz ✓' : 'Analiz yok'}
                      </button>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex flex-shrink-0 flex-col gap-1">
                      <Link
                        href={`/denemeler/${e.id}/duzenle`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                        <IconEdit size={15} />
                      </Link>
                      <button onClick={() => setDeletingId(e.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Ders detayları toggle butonu */}
                  {hasSubjectResults && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-100 py-1.5 text-[11px] text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? (
                        <>Ders detaylarını gizle <IconChevronUp size={12} /></>
                      ) : (
                        <>Ders bazlı netleri gör <IconChevronDown size={12} /></>
                      )}
                    </button>
                  )}
                </div>

                {/* Ders detayları — açılır panel */}
                {isExpanded && hasSubjectResults && (
                  <div className="border-t border-gray-100 px-4 pb-4">
                    <SubjectResults
                      subjectResults={e.subject_results}
                      examType={e.exam_type}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Karşılaştırma alt çubuğu */}
      {compareMode && selectedCompareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
            <span className="text-[13px] text-gray-600">{selectedCompareIds.length} deneme seçildi</span>
            <button
              onClick={() => setShowCompare(true)}
              disabled={selectedCompareIds.length < 2}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Karşılaştır
            </button>
            <button onClick={exitCompareMode} className="text-[12px] text-gray-400 hover:text-gray-600">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Denemeyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu deneme kaydı kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Vazgeç
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Karşılaştırma modalı */}
      {showCompare && compareExams.length >= 2 && (
        <ExamCompareModal exams={compareExams} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

// ─── Yapay zeka analiz sonucu tipleri ──────────────────────────

interface StudentAnalysis {
  student_name: string;
  guclu_dersler: string[];
  zayif_dersler: string[];
  trend: string;
  capraz_degerlendirme: string | null;
  oneriler: string[];
}

interface ExamAnalysisResult {
  ogrenciler: StudentAnalysis[];
  karsilastirma: string | null;
}

// ─── Karşılaştırma modalı ──────────────────────────────────────

function ExamCompareModal({ exams, onClose }: { exams: any[]; onClose: () => void }) {
  const subjectRows = useMemo(() => {
    const map = new Map<string, string>();
    exams.forEach((e) => {
      const subjects = e.exam_type === 'TYT' ? TYT_SUBJECTS : e.exam_type === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
      subjects.forEach((s) => { if (!map.has(s.key)) map.set(s.key, s.label); });
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [exams]);

  const maxNet = Math.max(...exams.map((e) => e.net_score), 1);

  const [includeMeetings, setIncludeMeetings] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ExamAnalysisResult | null>(null);

  const studentCount = useMemo(
    () => new Set(exams.map((e) => e.student_id)).size,
    [exams]
  );

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/analiz/deneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examIds: exams.map((e) => e.id),
          includeMeetings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analiz başarısız oldu.');
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message ?? 'Bir hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Deneme Karşılaştırma</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        {/* Toplam net karşılaştırma çubukları */}
        <div className="mb-6 space-y-2.5">
          {exams.map((e) => {
            const pct = Math.round((e.net_score / maxNet) * 100);
            const colors = scoreColor(e.net_score, e.max_score);
            return (
              <div key={e.id}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="truncate font-medium text-gray-700">
                    {e.students?.full_name} — {e.exam_name}
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                      {new Date(e.exam_date).toLocaleDateString('tr-TR')}
                    </span>
                  </span>
                  <span className={`flex-shrink-0 font-semibold ${colors.text}`}>{e.net_score} net</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ders bazlı tablo */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500">Ders</th>
                {exams.map((e) => (
                  <th key={e.id} className="min-w-[120px] px-3 py-2 text-center font-medium text-gray-500">
                    <div className="truncate">{e.students?.full_name}</div>
                    <div className="text-[10px] font-normal text-gray-400">{e.exam_name} · {e.exam_type}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="bg-blue-50/50 font-semibold">
                <td className="sticky left-0 z-10 bg-blue-50/50 px-3 py-2 text-gray-700">Toplam Net</td>
                {exams.map((e) => (
                  <td key={e.id} className="px-3 py-2 text-center text-blue-700">{e.net_score}</td>
                ))}
              </tr>
              {subjectRows.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-gray-600">{row.label}</td>
                  {exams.map((e) => {
                    const r = e.subject_results?.[row.key];
                    if (!r) return <td key={e.id} className="px-3 py-2 text-center text-gray-300">—</td>;
                    const net = getSubjectNet(r, e.exam_type);
                    const d = Number(r.dogru) || 0;
                    const y = Number(r.yanlis) || 0;
                    return (
                      <td key={e.id} className="px-3 py-2 text-center">
                        <div className="font-medium text-gray-800">{net}</div>
                        <div className="text-[10px] text-gray-400">{d}D · {y}Y</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Yapay zeka analizi bölümü */}
        <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-4">
          {!analysisResult && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-blue-600" />
                  <span className="text-[13px] font-medium text-gray-800">Yapay zeka ile analiz et</span>
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeMeetings}
                    onChange={(ev) => setIncludeMeetings(ev.target.checked)}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  Görüşme notlarını da dahil et
                </label>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {studentCount > 1
                  ? `${studentCount} farklı öğrencinin denemeleri ayrı ayrı analiz edilip aralarında kıyaslama yapılacak.`
                  : 'Güçlü/zayıf dersler, trend ve öneriler oluşturulacak.'}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <IconLoader2 size={15} className="animate-spin" />
                    Analiz ediliyor...
                  </>
                ) : (
                  <>
                    <IconSparkles size={15} />
                    Yapay Zeka ile Analiz Et
                  </>
                )}
              </button>
              {analysisError && (
                <p className="mt-2 text-[12px] text-red-600">{analysisError}</p>
              )}
            </>
          )}

          {analysisResult && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-blue-600" />
                  <span className="text-[13px] font-medium text-gray-800">Yapay Zeka Analizi</span>
                </div>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Temizle
                </button>
              </div>

              <div className="space-y-3">
                {analysisResult.ogrenciler.map((o, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-white p-3.5">
                    <div className="mb-2 text-[13px] font-semibold text-gray-900">{o.student_name}</div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {o.guclu_dersler.map((d) => (
                        <span key={d} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          + {d}
                        </span>
                      ))}
                      {o.zayif_dersler.map((d) => (
                        <span key={d} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                          − {d}
                        </span>
                      ))}
                    </div>

                    <p className="text-[12px] text-gray-600">
                      <span className="font-medium text-gray-700">Trend: </span>
                      {o.trend}
                    </p>

                    {o.capraz_degerlendirme && (
                      <p className="mt-1.5 text-[12px] text-gray-600">
                        <span className="font-medium text-gray-700">Görüşme değerlendirmesi: </span>
                        {o.capraz_degerlendirme}
                      </p>
                    )}

                    {o.oneriler.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[12px] font-medium text-gray-700">Öneriler:</span>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {o.oneriler.map((oneri, oi) => (
                            <li key={oi} className="text-[12px] text-gray-600">{oneri}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {analysisResult.karsilastirma && (
                  <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3.5">
                    <div className="mb-1.5 text-[12px] font-semibold text-purple-800">Öğrenciler Arası Kıyaslama</div>
                    <p className="text-[12px] text-purple-900">{analysisResult.karsilastirma}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}