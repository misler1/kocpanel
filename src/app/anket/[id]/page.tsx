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

    const { data: response } = await (supabase as any)
      .from('survey_responses')
      .insert({
        survey_id: id,
        entered_phone: phone.trim(),
        entered_name: name.trim(),
        match_status: 'pending',
      })
      .select().single();

    if (!response) { setStep('error'); return; }

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (step === 'inactive') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Anket Kapalı</h2>
          <p className="text-sm text-gray-500">Bu anket şu an aktif değil.</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Anket Bulunamadı</h2>
          <p className="text-sm text-gray-500">Bu anket linki geçersiz.</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Teşekkürler!</h2>
          <p className="text-sm text-gray-500">Yanıtların kaydedildi. Hocana iletilecek.</p>
        </div>
      </div>
    );
  }

  // ─── Bilgi girişi ─────────────────────────────────────────

  if (step === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white text-xl font-bold shadow-lg">K</div>
            <h1 className="text-xl font-bold text-gray-900">{survey?.title}</h1>
            {survey?.description && (
              <p className="mt-1 text-sm text-gray-500">{survey.description}</p>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Bilgilerini gir</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ad Soyad</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adın ve soyadın"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Telefon <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                onClick={() => name.trim() && setStep('survey')}
                disabled={!name.trim()}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-900">{survey?.title}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{name}</p>
        </div>

        {/* İlerleme çubuğu */}
        {totalTopics > 0 && (
          <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="text-gray-600">Genel ilerleme</span>
              <span className="font-semibold text-blue-600">{answeredTopics}/{totalTopics} konu</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Aktif ders */}
        {currentSub && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Ders başlığı */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                {currentSubjectIndex + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{currentSub.name}</div>
                <div className="text-[11px] text-gray-400">{currentSubjectIndex + 1} / {subjects.length} ders</div>
              </div>
              {/* Ders tamamlanma durumu */}
              {(() => {
                const doneCount = topics.filter((t) => (answers[`${templateQuestion?.id}_topic_${t.id}`] ?? []).length > 0).length;
                return (
                  <span className="text-[11px] font-medium text-gray-400">{doneCount}/{topics.length}</span>
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
                    <p className="mb-2.5 text-[13px] font-semibold text-gray-800">{topic.name}</p>
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
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                : disabled
                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50'
                            }`}
                          >
                            <span className={`mr-2 inline-block w-4 text-center ${isSelected ? 'text-blue-600' : 'text-transparent'}`}>✓</span>
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
            <div className="border-t border-gray-100 px-5 py-4">
              {!isLastSubject ? (
                <button
                  onClick={() => {
                    setCurrentSubjectIndex((i) => i + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors"
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
                      <div key={q.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="mb-3 text-[13px] font-semibold text-gray-800">{q.label}</p>
                        {q.question_type === 'text' ? (
                          <textarea
                            rows={3}
                            value={(answers[q.id] ?? [])[0] ?? ''}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: [e.target.value] }))}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
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
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50'
                                  }`}
                                >
                                  <span className={`mr-2 inline-block w-4 text-center ${isSelected ? 'text-blue-600' : 'text-transparent'}`}>✓</span>
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
                    className="w-full rounded-xl bg-emerald-600 py-3 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
                      ? 'bg-blue-600 text-white'
                      : allDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {allDone && idx !== currentSubjectIndex ? '✓ ' : ''}{sub.name}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 pb-8 text-center text-[11px] text-gray-400">
          {answeredTopics}/{totalTopics} konu tamamlandı
        </p>
      </div>
    </div>
  );
}