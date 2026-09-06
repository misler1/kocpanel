'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconTrash, IconLink, IconArrowLeft } from '@tabler/icons-react';

interface Option { id: string; label: string; sort_order: number; excludes_option_id: string | null; }
interface Topic { id: string; name: string; sort_order: number; }
interface Subject { id: string; name: string; sort_order: number; topics: Topic[]; }
interface OpenQuestion { id: string; label: string; sort_order: number; }

export function DuzenleClient({
  survey,
  initialSubjects,
  initialOptions,
  initialOpenQuestions,
}: {
  survey: any;
  initialSubjects: Subject[];
  initialOptions: Option[];
  initialOpenQuestions: OpenQuestion[];
}) {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>(initialOpenQuestions);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({});
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOpenQuestion, setNewOpenQuestion] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Dersler ──
  async function addSubject() {
    if (!newSubjectName.trim()) return;
    const { data } = await (supabase.from('survey_subjects') as any)
      .insert({ survey_id: survey.id, name: newSubjectName.trim(), sort_order: subjects.length })
      .select()
      .single();
    if (data) setSubjects((prev) => [...prev, { ...data, topics: [] }]);
    setNewSubjectName('');
  }

  async function deleteSubject(id: string) {
    await (supabase.from('survey_subjects') as any).delete().eq('id', id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Konular ──
  async function addTopic(subjectId: string) {
    const name = (newTopicName[subjectId] ?? '').trim();
    if (!name) return;
    const subject = subjects.find((s) => s.id === subjectId);
    const { data } = await (supabase.from('survey_topics') as any)
      .insert({ survey_subject_id: subjectId, name, sort_order: subject?.topics.length ?? 0 })
      .select()
      .single();
    if (data) {
      setSubjects((prev) => prev.map((s) => s.id === subjectId ? { ...s, topics: [...s.topics, data] } : s));
    }
    setNewTopicName((prev) => ({ ...prev, [subjectId]: '' }));
  }

  async function deleteTopic(subjectId: string, topicId: string) {
    await (supabase.from('survey_topics') as any).delete().eq('id', topicId);
    setSubjects((prev) => prev.map((s) => s.id === subjectId ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) } : s));
  }

  // ── Seçenek şablonu ──
  async function addOption() {
    if (!newOptionLabel.trim() || !survey.topic_option_template_question_id) return;
    const { data } = await (supabase.from('survey_options') as any)
      .insert({
        question_id: survey.topic_option_template_question_id,
        label: newOptionLabel.trim(),
        sort_order: options.length,
      })
      .select()
      .single();
    if (data) setOptions((prev) => [...prev, data]);
    setNewOptionLabel('');
  }

  async function deleteOption(id: string) {
    await (supabase.from('survey_options') as any).delete().eq('id', id);
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  async function setExclusion(optionId: string, excludesId: string | null) {
    await (supabase.from('survey_options') as any).update({ excludes_option_id: excludesId }).eq('id', optionId);
    setOptions((prev) => prev.map((o) => o.id === optionId ? { ...o, excludes_option_id: excludesId } : o));
  }

  // ── Açık uçlu sorular ──
  async function addOpenQuestion() {
    if (!newOpenQuestion.trim()) return;
    const { data } = await (supabase.from('survey_questions') as any)
      .insert({
        survey_id: survey.id,
        survey_topic_id: null,
        question_type: 'text',
        label: newOpenQuestion.trim(),
        sort_order: openQuestions.length,
      })
      .select()
      .single();
    if (data) setOpenQuestions((prev) => [...prev, data]);
    setNewOpenQuestion('');
  }

  async function deleteOpenQuestion(id: string) {
    await (supabase.from('survey_questions') as any).delete().eq('id', id);
    setOpenQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/anket/${survey.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/anketler" className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]">
        <IconArrowLeft size={15} /> Anketler
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">{survey.title}</h1>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]"
        >
          <IconLink size={15} />
          {copied ? 'Kopyalandı ✓' : 'Öğrenci linkini kopyala'}
        </button>
      </div>

      {/* Dersler ve konular */}
      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--ink)]">Dersler ve konular</h2>

        <div className="flex flex-col gap-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="rounded-lg border border-[var(--border)] bg-[var(--paper)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--ink)]">{subject.name}</span>
                <button onClick={() => deleteSubject(subject.id)} className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
                  <IconTrash size={14} />
                </button>
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {subject.topics.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 rounded-full bg-[var(--track-yks-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--track-yks)]">
                    {t.name}
                    <button onClick={() => deleteTopic(subject.id, t.id)} className="hover:text-[var(--danger)]">×</button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  value={newTopicName[subject.id] ?? ''}
                  onChange={(e) => setNewTopicName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addTopic(subject.id)}
                  placeholder="Konu adı, örn. Üslü Sayılar"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <button onClick={() => addTopic(subject.id)} className="rounded-lg bg-[var(--card)] border border-[var(--border)] px-2.5 text-[var(--ink-muted)] hover:text-[var(--accent-dark)]">
                  <IconPlus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubject()}
            placeholder="Yeni ders adı, örn. Matematik"
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button onClick={addSubject} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            <IconPlus size={15} /> Ders ekle
          </button>
        </div>
      </section>

      {/* Seçenek şablonu */}
      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <h2 className="mb-1 text-[14px] font-semibold text-[var(--ink)]">Seçenekler</h2>
        <p className="mb-3 text-[12px] text-[var(--ink-muted)]">Her konu için öğrenciye bu seçenekler sorulur.</p>

        <div className="flex flex-col gap-1.5">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-2">
              <span className="flex-1 text-[13px] text-[var(--ink)]">{opt.label}</span>
              <select
                value={opt.excludes_option_id ?? ''}
                onChange={(e) => setExclusion(opt.id, e.target.value || null)}
                className="rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-[11px] text-[var(--ink-muted)] outline-none"
              >
                <option value="">Hariç tutmaz</option>
                {options.filter((o) => o.id !== opt.id).map((o) => (
                  <option key={o.id} value={o.id}>Seçilince "{o.label}" iptal olsun</option>
                ))}
              </select>
              <button onClick={() => deleteOption(opt.id)} className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newOptionLabel}
            onChange={(e) => setNewOptionLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder="Yeni seçenek metni"
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button onClick={addOption} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            <IconPlus size={15} /> Seçenek ekle
          </button>
        </div>
      </section>

      {/* Açık uçlu sorular */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <h2 className="mb-1 text-[14px] font-semibold text-[var(--ink)]">Açık uçlu sorular</h2>
        <p className="mb-3 text-[12px] text-[var(--ink-muted)]">Anketin sonunda bir kez sorulur (konu bazlı değil).</p>

        <div className="flex flex-col gap-1.5">
          {openQuestions.map((q) => (
            <div key={q.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-2">
              <span className="flex-1 text-[13px] text-[var(--ink)]">{q.label}</span>
              <button onClick={() => deleteOpenQuestion(q.id)} className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newOpenQuestion}
            onChange={(e) => setNewOpenQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOpenQuestion()}
            placeholder="Soru metni, örn. Eklemek istediğin bir şey var mı?"
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button onClick={addOpenQuestion} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            <IconPlus size={15} /> Soru ekle
          </button>
        </div>
      </section>
    </div>
  );
}