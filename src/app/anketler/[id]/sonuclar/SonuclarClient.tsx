'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft, IconUsers, IconChevronDown, IconArrowRight, IconCheck } from '@tabler/icons-react';

const MATCH_LABELS: Record<string, { label: string; className: string }> = {
  matched: { label: 'Eşleşti', className: 'bg-[var(--success-soft)] text-[var(--success)]' },
  pending: { label: 'Onay bekliyor', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  pending_review: { label: 'Onay bekliyor', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  ambiguous: { label: 'Belirsiz', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  unmatched: { label: 'Eşleşmedi', className: 'bg-[var(--paper)] text-[var(--ink-muted)]' },
};

export function SonuclarClient({
  survey,
  subjects,
  options,
  openQuestions,
  responses,
  answers,
}: {
  survey: any;
  subjects: any[];
  options: any[];
  openQuestions: any[];
  responses: any[];
  answers: any[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<'cevaplar' | 'ozet'>('cevaplar');
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(subjects[0] ? [subjects[0].id] : []));
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushedIds, setPushedIds] = useState<Set<string>>(
    new Set(responses.filter((r: any) => r.pushed_to_topics).map((r: any) => r.id))
  );

  const optionById = useMemo(() => new Map(options.map((o: any) => [o.id, o])), [options]);
  const answersByResponse = useMemo(() => {
    const map = new Map<string, any[]>();
    answers.forEach((a: any) => {
      const list = map.get(a.response_id) ?? [];
      list.push(a);
      map.set(a.response_id, list);
    });
    return map;
  }, [answers]);

  // topicId -> { subject: ders adı, topic: konu adı }
  const topicMeta = useMemo(() => {
    const map = new Map<string, { subject: string; topic: string }>();
    subjects.forEach((s: any) => {
      s.topics.forEach((t: any) => {
        map.set(t.id, { subject: s.name, topic: t.name });
      });
    });
    return map;
  }, [subjects]);

  // Konu bazlı özet: topicId -> optionId -> sayı
  const topicAggregate = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    answers.forEach((a: any) => {
      if (!a.topic_id || !a.option_id) return;
      const topicMap = map.get(a.topic_id) ?? new Map<string, number>();
      topicMap.set(a.option_id, (topicMap.get(a.option_id) ?? 0) + 1);
      map.set(a.topic_id, topicMap);
    });
    return map;
  }, [answers]);

  function toggleSubject(id: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Konu takibine aktarma ──
  async function pushToTopics(response: any) {
    const studentId = response.student_id;
    if (!studentId) return;
    setPushingId(response.id);

    const respAnswers = answersByResponse.get(response.id) ?? [];
    const byTopic = new Map<string, any[]>();
    respAnswers.forEach((a: any) => {
      if (!a.topic_id) return;
      const list = byTopic.get(a.topic_id) ?? [];
      list.push(a);
      byTopic.set(a.topic_id, list);
    });

    for (const [topicId, topicAnswers] of byTopic.entries()) {
      const meta = topicMeta.get(topicId);
      if (!meta) continue;

      const labels: string[] = topicAnswers.map((a: any) => optionById.get(a.option_id)?.label ?? '');

      const computed: Record<string, boolean> = {};
      if (labels.includes('Konu Eksiğim Yok')) computed.konu_tamamlandi = true;
      if (labels.includes('Konu Eksiğim Var')) computed.konu_tamamlandi = false;
      if (labels.some((l) => ['1 Kaynaktan Soru Bitirdim', '2 Kaynaktan Soru Bitirdim', '3 Kaynaktan Soru Bitirdim'].includes(l))) {
        computed.kaynak1_sorular = true;
      }
      if (labels.some((l) => ['2 Kaynaktan Soru Bitirdim', '3 Kaynaktan Soru Bitirdim'].includes(l))) {
        computed.kaynak2_sorular = true;
      }
      if (labels.includes('Bu konuda soru kaçırmam')) computed.yanlislar_kontrol = true;

      if (Object.keys(computed).length === 0) continue;

      const { data: existing } = await (supabase.from('topic_progress') as any)
        .select('id')
        .eq('student_id', studentId)
        .eq('subject', meta.subject)
        .eq('topic', meta.topic)
        .maybeSingle();

      if (existing) {
        await (supabase.from('topic_progress') as any).update(computed).eq('id', existing.id);
      } else {
        await (supabase.from('topic_progress') as any).insert({
          student_id: studentId,
          subject: meta.subject,
          topic: meta.topic,
          konu_tamamlandi: false,
          kaynak1_sorular: false,
          kaynak2_sorular: false,
          yanlislar_kontrol: false,
          ...computed,
        });
      }
    }

    await (supabase.from('survey_responses') as any).update({ pushed_to_topics: true }).eq('id', response.id);
    setPushedIds((prev) => new Set(prev).add(response.id));
    setPushingId(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/anketler" className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]">
        <IconArrowLeft size={15} /> Anketler
      </Link>

      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--ink)]">{survey.title}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)]">
          <IconUsers size={14} /> {responses.length} yanıt
        </p>
      </div>

      {/* Sekmeler */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--paper)] p-1">
        <button
          onClick={() => setTab('cevaplar')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${
            tab === 'cevaplar' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
          }`}
        >
          Öğrenci bazlı cevaplar
        </button>
        <button
          onClick={() => setTab('ozet')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${
            tab === 'ozet' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
          }`}
        >
          Konu bazlı özet
        </button>
      </div>

      {/* ── Öğrenci bazlı cevaplar ── */}
      {tab === 'cevaplar' && (
        responses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center text-[13px] text-[var(--ink-muted)]">
            Henüz yanıt yok.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {responses.map((r: any) => {
              const match = MATCH_LABELS[r.match_status] ?? MATCH_LABELS['unmatched'];
              const displayName = r.students?.full_name ?? r.entered_name;
              const isOpen = expandedResponse === r.id;
              const respAnswers = answersByResponse.get(r.id) ?? [];
              const isPushed = pushedIds.has(r.id);
              const isPushing = pushingId === r.id;

              const byTopic = new Map<string, any[]>();
              const openTexts: { label: string; value: string }[] = [];
              respAnswers.forEach((a: any) => {
                if (a.topic_id) {
                  const list = byTopic.get(a.topic_id) ?? [];
                  list.push(a);
                  byTopic.set(a.topic_id, list);
                } else if (a.text_value) {
                  const q = openQuestions.find((q: any) => q.id === a.question_id);
                  openTexts.push({ label: q?.label ?? 'Ek soru', value: a.text_value });
                }
              });

              return (
                <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <button
                    onClick={() => setExpandedResponse(isOpen ? null : r.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-[var(--ink)]">{displayName}</div>
                      <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                        {new Date(r.submitted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{byTopic.size} konu işaretlendi
                        {r.entered_phone && ` · ${r.entered_phone}`}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${match.className}`}>
                      {match.label}
                    </span>
                    <IconChevronDown size={16} className={`flex-shrink-0 text-[var(--ink-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--border)] px-4 py-3">
                      {r.student_id && (
                        <button
                          onClick={() => pushToTopics(r)}
                          disabled={isPushing}
                          className={`mb-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${
                            isPushed
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]'
                          }`}
                        >
                          {isPushed ? <IconCheck size={14} /> : <IconArrowRight size={14} />}
                          {isPushing ? 'Aktarılıyor...' : isPushed ? 'Konu takibine aktarıldı' : 'Konu takibine aktar'}
                        </button>
                      )}
                      {!r.student_id && (
                        <p className="mb-3 text-[12px] text-[var(--ink-muted)]">
                          Bu yanıt henüz bir öğrenciyle eşleştirilmedi, aktarmadan önce eşleştirme yapılmalı.
                        </p>
                      )}

                      {byTopic.size === 0 && openTexts.length === 0 ? (
                        <p className="text-[12.5px] text-[var(--ink-muted)]">Bu yanıtta işaretlenmiş konu yok.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {Array.from(byTopic.entries()).map(([topicId, topicAnswers]) => {
                            const topicName = topicMeta.get(topicId)?.topic ?? 'Bilinmeyen konu';
                            return (
                              <div key={topicId} className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                                <span className="font-medium text-[var(--ink)]">{topicName}:</span>
                                {topicAnswers.map((a: any) => (
                                  <span key={a.id} className="rounded-full bg-[var(--track-yks-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--track-yks)]">
                                    {optionById.get(a.option_id)?.label ?? '—'}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                          {openTexts.map((t, i) => (
                            <div key={i} className="mt-1 rounded-lg bg-[var(--paper)] p-2.5 text-[12.5px]">
                              <div className="mb-1 font-medium text-[var(--ink)]">{t.label}</div>
                              <div className="text-[var(--ink-muted)]">{t.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Konu bazlı özet ── */}
      {tab === 'ozet' && (
        <div className="flex flex-col gap-2">
          {subjects.map((subject: any) => {
            const isOpen = expandedSubjects.has(subject.id);
            const subjectHasData = subject.topics.some((t: any) => topicAggregate.has(t.id));

            return (
              <div key={subject.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-[14px] font-semibold text-[var(--ink)]">{subject.name}</span>
                  <div className="flex items-center gap-2">
                    {!subjectHasData && <span className="text-[11px] text-[var(--ink-muted)]">Veri yok</span>}
                    <IconChevronDown size={16} className={`text-[var(--ink-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-4">
                    {subject.topics.map((topic: any) => {
                      const topicMap = topicAggregate.get(topic.id);
                      if (!topicMap || topicMap.size === 0) return null;
                      const total = Array.from(topicMap.values()).reduce((a, b) => a + b, 0);

                      return (
                        <div key={topic.id} className="py-3">
                          <div className="mb-2 text-[13px] font-medium text-[var(--ink)]">{topic.name}</div>
                          <div className="flex flex-col gap-1.5">
                            {options.map((opt: any) => {
                              const count = topicMap.get(opt.id) ?? 0;
                              if (count === 0) return null;
                              const pct = Math.round((count / total) * 100);
                              return (
                                <div key={opt.id} className="flex items-center gap-2">
                                  <span className="w-40 flex-shrink-0 truncate text-[11.5px] text-[var(--ink-muted)]">{opt.label}</span>
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper)]">
                                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="w-8 flex-shrink-0 text-right text-[11px] font-medium text-[var(--ink-muted)]">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {!subjectHasData && (
                      <p className="py-3 text-[12.5px] text-[var(--ink-muted)]">Bu derste henüz cevap yok.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}