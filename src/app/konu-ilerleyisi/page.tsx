/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { useExamFilter } from '@/lib/exam-filter-context';

interface Topic {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  konu_tamamlandi: boolean;
  kaynak1_sorular: boolean;
  kaynak2_sorular: boolean;
  kaynak3_sorular: boolean;
  yanlislar_kontrol: boolean;
}

type TopicStepKey = keyof Omit<Topic, 'id' | 'student_id' | 'subject' | 'topic'>;

interface Step {
  key: TopicStepKey;
  label: string;
  short: string;
}

const STEPS: Step[] = [
  { key: 'konu_tamamlandi', label: 'Konu Tamamlandı', short: 'Konu' },
  { key: 'kaynak1_sorular', label: '1. Kaynak Soru Çözüldü', short: '1. Kaynak' },
  { key: 'kaynak2_sorular', label: '2. Kaynak Soru Çözüldü', short: '2. Kaynak' },
  { key: 'kaynak3_sorular', label: '3. Kaynak Soru Çözüldü', short: '3. Kaynak' },
  { key: 'yanlislar_kontrol', label: 'Yanlışlar Kontrol Edildi', short: 'Yanlışlar' },
];

// İlerleme çubuğunda dikkate alınan 3 zorunlu adım.
const REQUIRED_STEPS: TopicStepKey[] = [
  'konu_tamamlandi',
  'kaynak1_sorular',
  'yanlislar_kontrol',
];

function getTopicProgress(t: Topic): { pct: number; color: string } {
  const done = REQUIRED_STEPS.filter((key) => t[key]).length;

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

  const filteredStudents = students.filter((student) => matchesFilter(student));

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await (supabase as any)
        .from('students')
        .select('id, full_name, resources, track, kurum, donem')
        .eq('coach_id', user.id)
        .neq('status', 'pasif')
        .order('full_name');

      setStudents(data ?? []);

      if (data?.length) {
        setSelectedStudentId(data[0].id);
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const student = students.find((item) => item.id === selectedStudentId);

    const subjects: string[] = student?.resources
      ? Object.keys(student.resources as Record<string, string[]>)
      : [];

    setStudentSubjects(subjects);
    setNewSubject((current) =>
      subjects.includes(current) ? current : subjects[0] ?? ''
    );
    setNewTopic('');

    loadTopics(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, students]);

  // Filtre değişince, seçili öğrenci artık filtreye uymuyorsa ilk öğrenciye geç.
  useEffect(() => {
    if (filteredStudents.length === 0) {
      setSelectedStudentId('');
      return;
    }

    if (!filteredStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents]);

  async function loadTopics(studentId: string) {
    const { data } = await (supabase as any)
      .from('topic_progress')
      .select(
        'id, student_id, subject, topic, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol'
      )
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
        kaynak3_sorular: false,
        yanlislar_kontrol: false,
      })
      .select(
        'id, student_id, subject, topic, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol'
      )
      .single();

    if (data) {
      setTopics((prev) => [...prev, data]);
      setNewTopic('');
    }
  }

  async function toggleStep(
    id: string,
    key: TopicStepKey,
    current: boolean
  ) {
    const nextValue = !current;

    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === id ? { ...topic, [key]: nextValue } : topic
      )
    );

    await (supabase as any)
      .from('topic_progress')
      .update({
        [key]: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  async function deleteTopic(id: string) {
    await (supabase as any).from('topic_progress').delete().eq('id', id);
    setTopics((prev) => prev.filter((topic) => topic.id !== id));
  }

  const grouped = topics.reduce<Record<string, Topic[]>>((acc, topic) => {
    if (!acc[topic.subject]) {
      acc[topic.subject] = [];
    }

    acc[topic.subject].push(topic);
    return acc;
  }, {});

  // Ders kartı ilerlemesi: zorunlu 3 adımı tamamlanmış konu sayısı.
  function subjectProgress(items: Topic[]) {
    if (items.length === 0) return 0;

    const fullyDone = items.filter((item) =>
      REQUIRED_STEPS.every((key) => item[key])
    ).length;

    return Math.round((fullyDone / items.length) * 100);
  }

  if (loading) {
    return (
      <div className="p-8 text-[13px] text-[var(--ink-muted)]">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">
          Konu ilerleyişi
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
          Konuları ders bazında takip edin
        </p>
      </div>

      {filteredStudents.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-muted)]">
          Henüz öğrenci eklenmemiş.
        </p>
      ) : (
        <>
          {/* Öğrenci seçimi */}
          <div className="mb-4 flex flex-wrap gap-2">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  selectedStudentId === student.id
                    ? 'bg-[var(--ink)] text-white'
                    : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'
                }`}
              >
                {student.full_name}
              </button>
            ))}
          </div>

          {studentSubjects.length === 0 && (
            <div className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--accent-dark)]">
              Bu öğrenciye ait kayıtlı ders bulunamadı. Öğrenci düzenleme
              sayfasından &quot;Kullanılan Kaynaklar&quot; bölümünü doldur.
            </div>
          )}

          {studentSubjects.length > 0 && (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
              <h2 className="mb-3 text-sm font-medium text-[var(--ink)]">
                Konu ekle
              </h2>

              <div className="flex gap-2">
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  {studentSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTopic();
                    }
                  }}
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

                const fullyDone = items.filter((item) =>
                  REQUIRED_STEPS.every((key) => item[key])
                ).length;

                const barColor =
                  pct === 100
                    ? 'bg-[var(--success)]'
                    : pct >= 50
                      ? 'bg-[var(--track-yks)]'
                      : pct > 0
                        ? 'bg-[var(--accent)]'
                        : '';

                return (
                  <div
                    key={subject}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4"
                  >
                    {/* Ders başlığı */}
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[var(--ink)]">
                        {subject}
                      </h3>

                      <span className="text-[12px] text-[var(--ink-muted)]">
                        {fullyDone}/{items.length} tamamlandı · %{pct}
                      </span>
                    </div>

                    <div className="mb-4 h-1.5 rounded-full bg-[var(--paper)]">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Konu satırları */}
                    <div className="divide-y divide-[var(--border)]">
                      {items.map((topic) => {
                        const { pct: topicPct, color } =
                          getTopicProgress(topic);
                        const allDone = topicPct === 100;

                        return (
                          <div key={topic.id} className="py-3">
                            {/* Konu adı + sil */}
                            <div className="mb-2 flex items-center justify-between">
                              <span
                                className={`text-[13px] font-medium ${
                                  allDone
                                    ? 'text-[var(--success)]'
                                    : 'text-[var(--ink)]'
                                }`}
                              >
                                {topic.topic}
                              </span>

                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-[var(--ink-muted)] hover:text-[var(--danger)]"
                                title="Konuyu sil"
                              >
                                <IconTrash size={13} />
                              </button>
                            </div>

                            {/* Konu progress bar */}
                            <div className="mb-2.5 h-1.5 rounded-full bg-[var(--paper)]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${color}`}
                                style={{ width: `${topicPct}%` }}
                              />
                            </div>

                            {/* Adım butonları */}
                            <div className="flex flex-wrap gap-2">
                              {STEPS.map((step) => {
                                const checked = Boolean(topic[step.key]);

                                return (
                                  <button
                                    key={step.key}
                                    type="button"
                                    title={step.label}
                                    onClick={() =>
                                      toggleStep(
                                        topic.id,
                                        step.key,
                                        checked
                                      )
                                    }
                                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                      checked
                                        ? 'bg-[var(--success)] text-white'
                                        : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'
                                    }`}
                                  >
                                    {checked && (
                                      <svg
                                        className="h-2.5 w-2.5"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                      >
                                        <path
                                          d="M1 4l3 3 5-6"
                                          stroke="currentColor"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}

                                    {step.short}
                                  </button>
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
