'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Step = 'loading' | 'info' | 'survey' | 'submitting' | 'done' | 'error' | 'inactive';

export default function AnketPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('loading');
  const [survey, setSurvey] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: s } = await (supabase as any)
        .from('surveys').select('*').eq('id', id).single();
      if (!s) { setStep('error'); return; }
      if (!s.is_active) { setStep('inactive'); return; }
      setSurvey(s);
      const { data: subs } = await (supabase as any)
        .from('survey_subjects')
        .select('*, survey_topics(*)')
        .eq('survey_id', id)
        .order('sort_order');
      setSubjects(subs ?? []);
      const { data: opts } = await (supabase as any)
        .from('survey_options').select('*').order('sort_order');
      setOptions(opts ?? []);
      const { data: qs } = await (supabase as any)
        .from('survey_questions').select('*').eq('survey_id', id).order('sort_order');
      setQuestions(qs ?? []);
      setStep('info');
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSelect(questionKey: string, optionId: string) {
    const selectedOption = options.find((o) => o.id === optionId);
    setAnswers((prev) => {
      const current = prev[questionKey] ?? [];
      let next: string[];
      if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId);
      } else {
        next = current.filter((id) => {
          const opt = options.find((o) => o.id === id);
          return opt?.excludes_option_id !== optionId && selectedOption?.excludes_option_id !== id;
        });
        next = [...next, optionId];
      }
      return { ...prev, [questionKey]: next };
    });
  }

  function isOptionDisabled(questionKey: string, optionId: string): boolean {
    const current = answers[questionKey] ?? [];
    return current.some((selectedId) => {
      const sel = options.find((o) => o.id === selectedId);
      return sel?.excludes_option_id === optionId;
    });
  }

  async function handleSubmit() {
    setStep('submitting');
    const { data: response, error: responseError } = await (supabase as any)
      .from('survey_responses')
      .insert({
        survey_id: id,
        entered_phone: phone.trim(),
        entered_name: name.trim(),
        match_status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id').single();

    if (responseError || !response) { 
      console.error('Response error:', responseError);
      setStep('error'); 
      return; 
    }
    const answerRows: any[] = [];
    Object.entries(answers).forEach(([key, optionIds]) => {
      const parts = key.split('_topic_');
      const questionId = parts[0];
      const topicId = parts[1] ?? null;
      (optionIds as string[]).forEach((optionId) => {
        answerRows.push({
          response_id: response.id,
          question_id: questionId,
          option_id: optionId,
          topic_id: topicId,
        });
      });
    });
    if (answerRows.length > 0) {
      await (supabase as any).from('survey_answers').insert(answerRows);
    }
    setStep('done');
  }

  // ─── Loading ─────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-white/50">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (step === 'inactive') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--paper)]">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--ink)]">Anket Kapalı</h2>
          <p className="text-sm text-[var(--ink-muted)]">Bu anket şu an aktif değil.</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)]">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--ink)]">Anket Bulunamadı</h2>
          <p className="text-sm text-[var(--ink-muted)]">Bu anket linki geçersiz.</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-900)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-soft)]">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--ink)]">Teşekkürler!</h2>
          <p className="text-sm text-[var(--ink-muted)]">Yanıtların kaydedildi. Hocana iletilecek.</p>
        </div>
      </div>
    );
  }

  // ─── Bilgi girişi ─────────────────────────────────────────
  if (step === 'info') {
    return (
      <div className="min-h-screen bg-[var(--navy-900)] px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-xl font-bold text-white shadow-lg">
              K
            </div>
            <h1 className="text-xl font-bold text-white">{survey?.title}</h1>
            {survey?.description && (
              <p className="mt-1 text-sm text-white/50">{survey.description}</p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">Bilgilerini gir</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Ad Soyad</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adın ve soyadın"
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                  Telefon <span className="font-normal text-[var(--ink-muted)]">(isteğe bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>
              <button
                onClick={() => name.trim() && setStep('survey')}
                disabled={!name.trim()}
                className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-40"
              >
                Ankete Başla →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Anket formu ──────────────────────────────────────────
  const templateQuestion = questions.find((q) => q.id === survey?.topic_option_template_question_id);
  const templateOptions = templateQuestion
    ? options.filter((o) => o.question_id === templateQuestion.id).sort((a: any, b: any) => a.sort_order - b.sort_order)
    : [];
  const generalQuestions = questions.filter(
    (q) => !q.survey_topic_id && q.id !== survey?.topic_option_template_question_id
  );
  const totalTopics = subjects.reduce((acc, s) => acc + (s.survey_topics?.length ?? 0), 0);
  const answeredTopics = subjects.reduce((acc, sub) => {
    return acc + (sub.survey_topics ?? []).filter((t: any) => {
      const key = `${templateQuestion?.id}_topic_${t.id}`;
      return (answers[key] ?? []).length > 0;
    }).length;
  }, 0);
  const progressPct = totalTopics > 0 ? Math.round((answeredTopics / totalTopics) * 100) : 0;
  const currentSub = subjects[currentSubjectIndex];
  const isLastSubject = currentSubjectIndex === subjects.length - 1;
  const topics: any[] = currentSub
    ? (currentSub.survey_topics ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    : [];

  return (
    <div className="min-h-screen bg-[var(--paper)] px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-[var(--ink)]">{survey?.title}</h1>
          <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{name}</p>
        </div>

        {/* İlerleme çubuğu */}
        {totalTopics > 0 && (
          <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="text-[var(--ink-muted)]">Genel ilerleme</span>
              <span className="font-semibold text-[var(--accent-dark)]">{answeredTopics}/{totalTopics} konu</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--paper)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Aktif ders */}
        {currentSub && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            {/* Ders başlığı */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {currentSubjectIndex + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--ink)]">{currentSub.name}</div>
                <div className="text-[11px] text-[var(--ink-muted)]">{currentSubjectIndex + 1} / {subjects.length} ders</div>
              </div>
              {(() => {
                const doneCount = topics.filter((t) => (answers[`${templateQuestion?.id}_topic_${t.id}`] ?? []).length > 0).length;
                return (
                  <span className="text-[11px] font-medium text-[var(--ink-muted)]">{doneCount}/{topics.length}</span>
                );
              })()}
            </div>

            {/* Konular */}
            <div className="space-y-5 px-5 pb-5 pt-4">
              {topics.map((topic) => {
                const key = `${templateQuestion?.id}_topic_${topic.id}`;
                const topicAnswers = answers[key] ?? [];
                return (
                  <div key={topic.id}>
                    <p className="mb-2.5 text-[13px] font-semibold text-[var(--ink)]">{topic.name}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {templateOptions.map((opt: any) => {
                        const isSelected = topicAnswers.includes(opt.id);
                        const disabled = !isSelected && isOptionDisabled(key, opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => !disabled && handleSelect(key, opt.id)}
                            disabled={disabled}
                            className={`rounded-xl border px-4 py-2.5 text-left text-[13px] font-medium transition-all ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)] shadow-sm'
                                : disabled
                                ? 'cursor-not-allowed border-[var(--border)] bg-[var(--paper)] text-[var(--ink-muted)]/50'
                                : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/40'
                            }`}
                          >
                            <span className={`mr-2 inline-block w-4 text-center ${isSelected ? 'text-[var(--accent-dark)]' : 'text-transparent'}`}>✓</span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sonraki ders / Gönder butonu */}
            <div className="border-t border-[var(--border)] px-5 py-4">
              {!isLastSubject ? (
                <button
                  onClick={() => {
                    setCurrentSubjectIndex((i) => i + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full rounded-xl bg-[var(--accent)] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                >
                  Sonraki: {subjects[currentSubjectIndex + 1]?.name} →
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Genel sorular (son derste göster) */}
                  {generalQuestions.map((q) => {
                    const qOptions = options
                      .filter((o) => o.question_id === q.id)
                      .sort((a: any, b: any) => a.sort_order - b.sort_order);
                    return (
                      <div key={q.id} className="rounded-xl border border-[var(--border)] bg-[var(--paper)] p-4">
                        <p className="mb-3 text-[13px] font-semibold text-[var(--ink)]">{q.label}</p>
                        {q.question_type === 'text' ? (
                          <textarea
                            rows={3}
                            value={(answers[q.id] ?? [])[0] ?? ''}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: [e.target.value] }))}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                            placeholder="Yanıtını yaz..."
                          />
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5">
                            {qOptions.map((opt: any) => {
                              const isSelected = (answers[q.id] ?? []).includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleSelect(q.id, opt.id)}
                                  className={`rounded-xl border px-4 py-2.5 text-left text-[13px] font-medium transition-all ${
                                    isSelected
                                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                                      : 'border-[var(--border)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/40'
                                  }`}
                                >
                                  <span className={`mr-2 inline-block w-4 text-center ${isSelected ? 'text-[var(--accent-dark)]' : 'text-transparent'}`}>✓</span>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={handleSubmit}
                    disabled={step === 'submitting'}
                    className="w-full rounded-xl bg-[var(--success)] py-3 text-[13px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {step === 'submitting' ? 'Gönderiliyor...' : 'Anketi Tamamla ✓'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ders navigasyonu (geri dönmek için) */}
        {subjects.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {subjects.map((sub, idx) => {
              const subTopics = sub.survey_topics ?? [];
              const done = subTopics.filter((t: any) => (answers[`${templateQuestion?.id}_topic_${t.id}`] ?? []).length > 0).length;
              const allDone = subTopics.length > 0 && done === subTopics.length;
              return (
                <button
                  key={sub.id}
                  onClick={() => setCurrentSubjectIndex(idx)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    idx === currentSubjectIndex
                      ? 'bg-[var(--accent)] text-white'
                      : allDone
                      ? 'bg-[var(--success-soft)] text-[var(--success)]'
                      : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'
                  }`}
                >
                  {allDone && idx !== currentSubjectIndex ? '✓ ' : ''}{sub.name}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 pb-8 text-center text-[11px] text-[var(--ink-muted)]">
          {answeredTopics}/{totalTopics} konu tamamlandı
        </p>
      </div>
    </div>
  );
}