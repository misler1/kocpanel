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
  topic_id?: string | null;
  konu_tamamlandi: boolean;
  kaynak1_sorular: boolean;
  kaynak2_sorular: boolean;
  kaynak3_sorular: boolean;
  yanlislar_kontrol: boolean;
}

// Havuz (kazanım/konu) tipleri
interface PoolCategory {
  id: string;
  code: string;
  name: string;
}
interface PoolSubject {
  id: string;
  category_id: string;
  name: string;
}
interface PoolTopic {
  id: string;
  code: string | null;
  name: string;
  unit: string | null;
}

type TopicStepKey = keyof Omit<
  Topic,
  'id' | 'student_id' | 'subject' | 'topic' | 'topic_id'
>;

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

const TOPIC_SELECT =
  'id, student_id, subject, topic, topic_id, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol';

const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

// TYT ve AYT'de aynı ders adı (Matematik) olduğu için ders etiketine ön ek eklenir.
function subjectLabel(cat: PoolCategory | undefined, subjectName: string) {
  if (cat && (cat.code === 'TYT' || cat.code === 'AYT')) {
    return `${cat.code} ${subjectName}`;
  }
  return subjectName;
}

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

  // Havuz state'i
  const [poolCats, setPoolCats] = useState<PoolCategory[]>([]);
  const [poolSubjects, setPoolSubjects] = useState<PoolSubject[]>([]);
  const [poolCatId, setPoolCatId] = useState('');
  const [poolSubjectId, setPoolSubjectId] = useState('');
  const [poolTopics, setPoolTopics] = useState<PoolTopic[]>([]);
  const [poolTopicsLoading, setPoolTopicsLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const filteredStudents = students.filter((student) => matchesFilter(student));
  const [sinifFilter, setSinifFilter] = useState('');
  const availableSiniflar = Array.from(
    new Set(filteredStudents.map((s: any) => s.sinif_sube).filter(Boolean))
  ).sort();
  const pickerStudents = sinifFilter
    ? filteredStudents.filter((s: any) => s.sinif_sube === sinifFilter)
    : filteredStudents;

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
        .select('id, full_name, resources, track, kurum, donem, sinif_sube')
        .eq('coach_id', user.id)
        .neq('status', 'pasif')
        .order('full_name');

      setStudents(data ?? []);

      if (data?.length) {
        setSelectedStudentId(data[0].id);
      }

      // Havuz: sınav türleri ve dersler (küçük listeler)
      const [{ data: cats }, { data: subs }] = await Promise.all([
        (supabase as any)
          .from('exam_categories')
          .select('id, code, name')
          .order('sort_order'),
        (supabase as any)
          .from('curriculum_subjects')
          .select('id, category_id, name')
          .order('sort_order')
          .order('name'),
      ]);
      setPoolCats(cats ?? []);
      setPoolSubjects(subs ?? []);

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

  // Öğrenci değişince sınav türünü öğrencinin alanına göre öner (koç değiştirebilir).
  useEffect(() => {
    if (!poolCats.length || !selectedStudentId) return;
    const student = students.find((s) => s.id === selectedStudentId);
    const track = String(student?.track ?? '').replace(/İ/g, 'I').toUpperCase();
    let code = 'TYT';
    if (track.includes('LGS')) code = 'LGS';
    else if (track.includes('DIL')) code = 'DIL';
    const cat = poolCats.find((c) => c.code === code) ?? poolCats[0];
    setPoolCatId(cat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, poolCats]);

  // Sınav türü değişince ilk dersi seç
  useEffect(() => {
    const list = poolSubjects.filter((s) => s.category_id === poolCatId);
    setPoolSubjectId((cur) =>
      list.some((s) => s.id === cur) ? cur : list[0]?.id ?? ''
    );
  }, [poolCatId, poolSubjects]);

  // Ders değişince havuzdan konuları çek
  useEffect(() => {
    setPicked(new Set());
    if (!poolSubjectId) {
      setPoolTopics([]);
      return;
    }
    let cancelled = false;
    setPoolTopicsLoading(true);
    (supabase as any)
      .from('curriculum_topics')
      .select('id, code, name, unit')
      .eq('subject_id', poolSubjectId)
      .eq('is_active', true)
      .order('sort_order')
      .range(0, 999)
      .then(({ data }: any) => {
        if (cancelled) return;
        setPoolTopics(data ?? []);
        setPoolTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolSubjectId]);

  // Filtre değişince, seçili öğrenci artık filtreye uymuyorsa ilk öğrenciye geç.
  useEffect(() => {
    if (pickerStudents.length === 0) {
      setSelectedStudentId('');
      return;
    }

    if (!pickerStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(pickerStudents[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerStudents]);

  async function loadTopics(studentId: string) {
    const { data } = await (supabase as any)
      .from('topic_progress')
      .select(TOPIC_SELECT)
      .eq('student_id', studentId)
      .order('subject');

    setTopics(data ?? []);
  }

  // --- Havuzdan ekleme ---
  const currentCat = poolCats.find((c) => c.id === poolCatId);
  const currentPoolSubject = poolSubjects.find((s) => s.id === poolSubjectId);
  const label = currentPoolSubject
    ? subjectLabel(currentCat, currentPoolSubject.name)
    : '';

  const addedIds = new Set(topics.map((t) => t.topic_id).filter(Boolean) as string[]);
  const addedTexts = new Set(
    topics.filter((t) => norm(t.subject) === norm(label)).map((t) => norm(t.topic))
  );
  const isAdded = (p: PoolTopic) =>
    addedIds.has(p.id) || addedTexts.has(norm(p.name));

  const selectable = poolTopics.filter((p) => !isAdded(p));
  const allPicked = selectable.length > 0 && selectable.every((p) => picked.has(p.id));

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setPicked(allPicked ? new Set() : new Set(selectable.map((p) => p.id)));
  }

  async function addPicked() {
    if (!selectedStudentId || !label || picked.size === 0) return;
    setAdding(true);

    const rows = poolTopics
      .filter((p) => picked.has(p.id) && !isAdded(p))
      .map((p) => ({
        student_id: selectedStudentId,
        subject: label,
        topic: p.code ? `${p.code} · ${p.name}` : p.name,
        topic_id: p.id,
        konu_tamamlandi: false,
        kaynak1_sorular: false,
        kaynak2_sorular: false,
        kaynak3_sorular: false,
        yanlislar_kontrol: false,
      }));

    if (rows.length) {
      const { data } = await (supabase as any)
        .from('topic_progress')
        .insert(rows)
        .select(TOPIC_SELECT);

      if (data) setTopics((prev) => [...prev, ...data]);
    }

    setPicked(new Set());
    setAdding(false);
  }

  // --- Elle ekleme (havuzda olmayan konu için) ---
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
      .select(TOPIC_SELECT)
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

  const catSubjects = poolSubjects.filter((s) => s.category_id === poolCatId);

  // Konuları ünitelere göre grupla (listede başlık göstermek için)
  const unitGroups = poolTopics.reduce<Record<string, PoolTopic[]>>((acc, p) => {
    const key = p.unit || '';
    (acc[key] ||= []).push(p);
    return acc;
  }, {});

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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            {availableSiniflar.length > 0 && (
              <select
                value={sinifFilter}
                onChange={(e) => setSinifFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none sm:w-44"
              >
                <option value="">Tüm sınıflar</option>
                {availableSiniflar.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {pickerStudents.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-muted)]">Bu sınıfta öğrenci yok.</p>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] font-medium text-[var(--ink)] focus:outline-none"
              >
                {pickerStudents.map((student: any) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}{student.sinif_sube ? ` — ${student.sinif_sube}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedStudentId && (
          <>
          {/* Konu ekle: havuzdan seçim */}
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--ink)]">
              Konu ekle
            </h2>

            {poolCats.length === 0 ? (
              <p className="text-[12px] text-[var(--ink-muted)]">
                Kazanım havuzunda henüz kayıt yok. Yönetici havuzu doldurunca
                konular buradan seçilebilecek.
              </p>
            ) : (
              <>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={poolCatId}
                    onChange={(e) => setPoolCatId(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] sm:w-44"
                  >
                    {poolCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={poolSubjectId}
                    onChange={(e) => setPoolSubjectId(e.target.value)}
                    disabled={catSubjects.length === 0}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  >
                    {catSubjects.length === 0 && <option value="">Ders yok</option>}
                    {catSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {poolTopicsLoading ? (
                  <p className="text-[12px] text-[var(--ink-muted)]">Konular yükleniyor...</p>
                ) : poolTopics.length === 0 ? (
                  <p className="text-[12px] text-[var(--ink-muted)]">
                    Bu derste henüz konu tanımlı değil.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--ink-muted)]">
                      <button
                        type="button"
                        onClick={toggleAll}
                        disabled={selectable.length === 0}
                        className="font-medium text-[var(--accent)] disabled:opacity-40"
                      >
                        {allPicked ? 'Seçimi temizle' : 'Tümünü seç'}
                      </button>
                      <span>
                        {poolTopics.length - selectable.length} / {poolTopics.length} zaten ekli
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)]">
                      {Object.entries(unitGroups).map(([unit, list]) => (
                        <div key={unit || 'none'}>
                          {unit && (
                            <div className="sticky top-0 bg-[var(--paper)] px-3 py-1.5 text-[11px] font-medium text-[var(--ink-muted)]">
                              {unit}
                            </div>
                          )}
                          {list.map((p) => {
                            const added = isAdded(p);
                            const checked = added || picked.has(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex cursor-pointer items-start gap-2 border-t border-[var(--border)] px-3 py-2 text-[13px] first:border-t-0 ${
                                  added ? 'cursor-default opacity-50' : 'hover:bg-[var(--paper)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  disabled={added}
                                  onChange={() => togglePick(p.id)}
                                />
                                <span className="text-[var(--ink)]">
                                  {p.code && (
                                    <span className="mr-1.5 text-[11px] text-[var(--ink-muted)]">
                                      {p.code}
                                    </span>
                                  )}
                                  {p.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={addPicked}
                      disabled={picked.size === 0 || adding}
                      className="mt-3 flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-50"
                    >
                      <IconPlus size={15} />
                      {adding ? 'Ekleniyor...' : `Seçilen ${picked.size} konuyu ekle`}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Elle ekleme (havuzda olmayan konu için) */}
            {studentSubjects.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="text-[12px] text-[var(--ink-muted)] underline"
                >
                  {showManual ? 'Elle eklemeyi gizle' : 'Havuzda olmayan konuyu elle ekle'}
                </button>

                {showManual && (
                  <div className="mt-2 flex gap-2">
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
                )}
              </div>
            )}
          </div>

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
        </>
      )}
    </div>
  );
}