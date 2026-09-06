/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';

interface Topic {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  konu_tamamlandi: boolean;
  kaynak1_sorular: boolean;
  kaynak2_sorular: boolean;
  yanlislar_kontrol: boolean;
}

const STEPS: { key: keyof Omit<Topic, 'id' | 'student_id' | 'subject' | 'topic'>; label: string }[] = [
  { key: 'konu_tamamlandi', label: 'Konu Tamamlandı' },
  { key: 'kaynak1_sorular', label: '1. Kaynak Soru Çözüldü' },
  { key: 'kaynak2_sorular', label: '2. Kaynak Soru Çözüldü' },
  { key: 'yanlislar_kontrol', label: 'Yanlışlar Kontrol Edildi' },
];

// Zorunlu 3 adım (bar dolumu bunlara göre)
const REQUIRED_STEPS: (keyof Omit<Topic, 'id' | 'student_id' | 'subject' | 'topic'>)[] = [
  'konu_tamamlandi',
  'kaynak1_sorular',
  'yanlislar_kontrol',
];

function getTopicProgress(t: Topic): { pct: number; color: string } {
  const done = REQUIRED_STEPS.filter((k) => t[k]).length;
  if (done === 0) return { pct: 0, color: 'bg-[var(--border)]' };
  if (done === 1) return { pct: 33, color: 'bg-[var(--accent)]' };
  if (done === 2) return { pct: 66, color: 'bg-[var(--track-yks)]' };
  return { pct: 100, color: 'bg-[var(--success)]' };
}

export default function KonuIlerleyisiPage() {
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const filteredStudents = students.filter((s) => matchesFilter(s));

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('students')
        .select('id, full_name, resources, track, kurum, donem')
        .eq('coach_id', user.id)
        .neq('status', 'pasif')
        .order('full_name');
      setStudents(data ?? []);
      if (data?.length) setSelectedStudentId(data[0].id);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    const st = students.find((s) => s.id === selectedStudentId);
    const subjects: string[] = st?.resources ? Object.keys(st.resources as Record<string, string[]>) : [];
    setStudentSubjects(subjects);
    setNewSubject(subjects[0] ?? '');
    setNewTopic('');
    loadTopics(selectedStudentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, students]);
    // Filtre değişince, seçili öğrenci artık filtreye uymuyorsa ilkine geç
  useEffect(() => {
    if (filteredStudents.length === 0) {
      setSelectedStudentId('');
      return;
    }
    if (!filteredStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents]);
  async function loadTopics(studentId: string) {
    const { data } = await (supabase as any)
      .from('topic_progress')
      .select('id, student_id, subject, topic, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, yanlislar_kontrol')
      .eq('student_id', studentId)
      .order('subject');
    setTopics(data ?? []);
  }

  async function addTopic() {
    if (!newTopic.trim() || !selectedStudentId || !newSubject) return;
    const { data } = await (supabase as any)
      .from('topic_progress')
      .insert({
        student_id: selectedStudentId,
        subject: newSubject,
        topic: newTopic.trim(),
        konu_tamamlandi: false,
        kaynak1_sorular: false,
        kaynak2_sorular: false,
        yanlislar_kontrol: false,
      })
      .select('id, student_id, subject, topic, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, yanlislar_kontrol')
      .single();
    if (data) {
      setTopics((prev) => [...prev, data]);
      setNewTopic('');
    }
  }

  async function toggleStep(id: string, key: keyof Omit<Topic, 'id' | 'student_id' | 'subject' | 'topic'>, current: boolean) {
    setTopics((prev) => prev.map((t) => t.id === id ? { ...t, [key]: !current } : t));
    await (supabase as any)
      .from('topic_progress')
      .update({ [key]: !current, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  async function deleteTopic(id: string) {
    await (supabase as any).from('topic_progress').delete().eq('id', id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  const grouped = topics.reduce((acc: Record<string, Topic[]>, t) => {
    if (!acc[t.subject]) acc[t.subject] = [];
    acc[t.subject].push(t);
    return acc;
  }, {});

  // Ders kartı progress: zorunlu 3 adımı tamamlanmış konu sayısı
  function subjectProgress(items: Topic[]) {
    const fullyDone = items.filter((i) => REQUIRED_STEPS.every((k) => i[k])).length;
    return Math.round((fullyDone / items.length) * 100);
  }

  if (loading) return <div className="p-8 text-[13px] text-[var(--ink-muted)]">Yükleniyor...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">Konu ilerleyişi</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">Konuları ders bazında takip edin</p>
      </div>

     {filteredStudents.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-muted)]">Henüz öğrenci eklenmemiş.</p>
      ) : (
        <>
          {/* Öğrenci seçimi */}
          <div className="mb-4 flex flex-wrap gap-2">
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${selectedStudentId === s.id ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'}`}
              >
                {s.full_name}
              </button>
            ))}
          </div>

          {studentSubjects.length === 0 && (
            <div className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--accent-dark)]">
              Bu öğrenciye ait kayıtlı ders bulunamadı. Öğrenci düzenleme sayfasından &quot;Kullanılan Kaynaklar&quot; bölümünü doldur.
            </div>
          )}

          {studentSubjects.length > 0 && (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
              <h2 className="mb-3 text-sm font-medium text-[var(--ink)]">Konu ekle</h2>
              <div className="flex gap-2">
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  {studentSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                  placeholder="Konu adı..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={addTopic}
                  className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                >
                  <IconPlus size={15} />
                </button>
              </div>
            </div>
          )}

          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-[13px] text-[var(--ink-muted)]">
              Henüz konu eklenmemiş.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([subject, items]) => {
                const pct = subjectProgress(items);
                const fullyDone = items.filter((i) => REQUIRED_STEPS.every((k) => i[k])).length;
                const barColor =
                  pct === 100 ? 'bg-[var(--success)]' : pct >= 50 ? 'bg-[var(--track-yks)]' : pct > 0 ? 'bg-[var(--accent)]' : '';

                return (
                  <div key={subject} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
                    {/* Ders başlığı */}
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[var(--ink)]">{subject}</h3>
                      <span className="text-[12px] text-[var(--ink-muted)]">{fullyDone}/{items.length} tamamlandı · %{pct}</span>
                    </div>
                    <div className="mb-4 h-1.5 rounded-full bg-[var(--paper)]">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>

                    {/* Konu satırları */}
                    <div className="divide-y divide-[var(--border)]">
                      {items.map((t) => {
                        const { pct: tPct, color } = getTopicProgress(t);
                        const allDone = tPct === 100;

                        return (
                          <div key={t.id} className="py-3">
                            {/* Konu adı + sil */}
                            <div className="mb-2 flex items-center justify-between">
                              <span className={`text-[13px] font-medium ${allDone ? 'text-[var(--success)]' : 'text-[var(--ink)]'}`}>
                                {t.topic}
                              </span>
                              <button onClick={() => deleteTopic(t.id)} className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
                                <IconTrash size={13} />
                              </button>
                            </div>

                            {/* Konu progress bar */}
                            <div className="mb-2.5 h-1.5 rounded-full bg-[var(--paper)]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${color}`}
                                style={{ width: `${tPct}%` }}
                              />
                            </div>

                            {/* Checkboxlar */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {STEPS.map((step) => {
                                const checked = t[step.key] as boolean;
                                const isExtra = step.key === 'kaynak2_sorular';
                                return (
                                  <label
                                    key={step.key}
                                    className="flex cursor-pointer select-none items-center gap-1.5"
                                    onClick={() => toggleStep(t.id, step.key, checked)}
                                  >
                                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                      checked
                                        ? 'border-[var(--success)] bg-[var(--success)]'
                                        : 'border-[var(--border)] bg-[var(--card)]'
                                    }`}>
                                      {checked && (
                                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </span>
                                    <span className={`text-[12px] ${
                                      checked
                                        ? 'text-[var(--success)] line-through'
                                        : isExtra
                                        ? 'text-[var(--ink-muted)]'
                                        : 'text-[var(--ink-muted)]'
                                    }`}>
                                      {step.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}