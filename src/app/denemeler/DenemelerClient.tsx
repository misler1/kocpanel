'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconChartBar, IconEdit, IconTrash } from '@tabler/icons-react';
import { StudentFilter } from '@/components/StudentFilter';

const TYPE_BADGE: Record<string, string> = {
  TYT: 'bg-blue-50 text-blue-700',
  AYT: 'bg-purple-50 text-purple-700',
  LGS: 'bg-teal-50 text-teal-700',
};

function scoreColor(net: number, max: number) {
  const pct = (net / max) * 100;
  if (pct >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
  if (pct >= 45) return { bar: 'bg-amber-400', text: 'text-amber-700' };
  return { bar: 'bg-red-400', text: 'text-red-700' };
}

interface Props {
  initialExams: any[];
  students: any[];
  initialFilter?: string;
}

export function DenemelerClient({ initialExams, students, initialFilter }: Props) {
  const supabase = createClient();
  const [exams, setExams] = useState<any[]>(initialExams);
  const [filter, setFilter] = useState(initialFilter ?? '');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = filter ? exams.filter((e) => e.student_id === filter) : exams;

  // ── Analiz toggle ──
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

  // ── Sil ──
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
        <Link href="/denemeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100">
          <IconPlus size={15} />
          Deneme gir
        </Link>
      </div>

      {/* Filtre */}
      {students.length > 0 && (
        <StudentFilter
          students={students}
          selectedId={filter}
          onSelect={setFilter}
          showAll
        />
      )}

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
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
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

            return (
              <div key={e.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
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
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`text-[16px] font-bold ${colors.text}`}>{e.net_score}</div>
                    <div className="text-[11px] text-gray-400">/{e.max_score} net</div>
                    {/* Tıklanabilir analiz badge */}
                    <button
                      onClick={() => handleToggleAnalysis(e)}
                      disabled={isToggling}
                      title={e.analysis_done ? 'Analizi kaldır' : 'Analiz yapıldı olarak işaretle'}
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
                      title="Düzenle"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                      <IconEdit size={15} />
                    </Link>
                    <button onClick={() => setDeletingId(e.id)}
                      title="Sil"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Silme onayı ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Denemeyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu deneme kaydı kalıcı olarak silinecek. Geri alınamaz.</p>
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
    </div>
  );
}