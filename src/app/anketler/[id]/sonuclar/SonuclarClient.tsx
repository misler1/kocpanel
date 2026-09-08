'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  IconArrowLeft, IconUsers, IconChevronDown, IconArrowRight, IconCheck,
  IconUserPlus, IconSearch, IconAlertTriangle, IconFileDownload,
} from '@tabler/icons-react';

const MATCH_LABELS: Record<string, { label: string; className: string }> = {
  matched: { label: 'Eşleşti', className: 'bg-[var(--success-soft)] text-[var(--success)]' },
  pending: { label: 'Onay bekliyor', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  pending_review: { label: 'Onay bekliyor', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  ambiguous: { label: 'Belirsiz', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  unmatched: { label: 'Eşleşmedi', className: 'bg-[var(--paper)] text-[var(--ink-muted)]' },
  manual: { label: 'Elle eşleştirildi', className: 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]' },
};

const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
const KONU_EKSIK_LABEL = normalize('Konu Eksiğim Var');
const KONU_YOK_LABEL = normalize('Konu Eksiğim Yok');
const SORU_EKSIK_LABEL = normalize('Soru Eksiğim Var');
const TEK_KAYNAK_LABEL = normalize('1 Kaynaktan Soru Bitirdim');
const IKI_KAYNAK_LABEL = normalize('2 Kaynaktan Soru Bitirdim');
const UC_KAYNAK_LABEL = normalize('3 Kaynaktan Soru Bitirdim');
const KACIRMAM_LABEL = normalize('Bu konuda soru kaçırmam');

// Karne raporunda (ekran + PDF) tutarlı kalması için sabit hex renkler.
// html2canvas, var(--renk) gibi CSS değişkenlerini güvenilir okuyamadığından
// sadece bu rapor bölümünde doğrudan hex kullanıyoruz.
const KARNE_COLORS = {
  success: '#16A34A',
  successSoft: '#F0FDF4',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  accent: '#2563EB',
  accentDark: '#1D4ED8',
  accentSoft: '#EFF6FF',
  ink: '#111827',
  inkMuted: '#6B7280',
  paper: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

function Donut({
  pct, size = 88, stroke = 10, color, trackColor = KARNE_COLORS.paper, textColor = KARNE_COLORS.ink,
}: { pct: number; size?: number; stroke?: number; color: string; trackColor?: string; textColor?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(pct, 0), 100) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.22} fontWeight="700" fill={textColor}>
        %{pct}
      </text>
    </svg>
  );
}

function SegmentBar({ segments, trackColor = KARNE_COLORS.paper }: { segments: { pct: number; color: string }[]; trackColor?: string }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      {segments.map((s, i) => s.pct > 0 && (
        <div key={i} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
      ))}
    </div>
  );
}

// Madde işaretli, düzenli eksik listesi (chip bulutu yerine)
function IssueList({ title, items, color, softColor }: { title: string; items: string[]; color: string; softColor: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color }}>
        <IconAlertTriangle size={12} /> {title} ({items.length})
      </div>
      <ul className="flex flex-col gap-1 rounded-lg px-3 py-2" style={{ backgroundColor: softColor }}>
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[12px]" style={{ color }}>
            <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="leading-snug">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SonuclarClient({
  survey,
  subjects,
  options,
  openQuestions,
  responses: initialResponses,
  answers,
  students,
}: {
  survey: any;
  subjects: any[];
  options: any[];
  openQuestions: any[];
  responses: any[];
  answers: any[];
  students: any[];
}) {
  const supabase = createClient();
  const [responses, setResponses] = useState(initialResponses);
  const [search, setSearch] = useState('');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [view, setView] = useState<'karne' | 'cevaplar' | 'ozet'>('karne');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(subjects[0] ? [subjects[0].id] : []));
  const [pushing, setPushing] = useState(false);
  const [pushedIds, setPushedIds] = useState<Set<string>>(
    new Set(initialResponses.filter((r: any) => r.pushed_to_topics).map((r: any) => r.id))
  );
  const [assigning, setAssigning] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const topicMeta = useMemo(() => {
    const map = new Map<string, { subject: string; topic: string }>();
    subjects.forEach((s: any) => {
      s.topics.forEach((t: any) => {
        map.set(t.id, { subject: s.name, topic: t.name });
      });
    });
    return map;
  }, [subjects]);

  const filteredResponses = useMemo(() => {
    if (!search.trim()) return responses;
    const q = search.trim().toLowerCase();
    return responses.filter((r: any) => (r.students?.full_name ?? r.entered_name).toLowerCase().includes(q));
  }, [responses, search]);

  const selectedResponse = responses.find((r: any) => r.id === selectedResponseId) ?? null;

  const selectedTopicMap = useMemo(() => {
    if (!selectedResponse) return new Map<string, any[]>();
    const respAnswers = answersByResponse.get(selectedResponse.id) ?? [];
    const map = new Map<string, any[]>();
    respAnswers.forEach((a: any) => {
      if (!a.topic_id) return;
      const list = map.get(a.topic_id) ?? [];
      list.push(a);
      map.set(a.topic_id, list);
    });
    return map;
  }, [selectedResponse, answersByResponse]);

  const selectedOpenTexts = useMemo(() => {
    if (!selectedResponse) return [];
    const respAnswers = answersByResponse.get(selectedResponse.id) ?? [];
    return respAnswers
      .filter((a: any) => !a.topic_id && a.text_value)
      .map((a: any) => ({
        label: openQuestions.find((q: any) => q.id === a.question_id)?.label ?? 'Ek soru',
        value: a.text_value,
      }));
  }, [selectedResponse, answersByResponse, openQuestions]);

  // ── Karne hesaplama (pozitif tanım: Konu Eksiğim Yok VE soru tamam işareti) ──
  const karne = useMemo(() => {
    const perSubject = subjects.map((subject: any) => {
      const total = subject.topics.length; // dersteki TÜM konu sayısı
      const answeredTopics = subject.topics.filter((t: any) => selectedTopicMap.has(t.id));
      const konuEksikList: string[] = [];
      const soruEksikList: string[] = [];
      const unknown: string[] = [];
      const completedList: string[] = [];

      answeredTopics.forEach((t: any) => {
        const rawAnswers = selectedTopicMap.get(t.id)!;
        const rawLabels = rawAnswers.map((a: any) => optionById.get(a.option_id)?.label);
        const hasMissingOption = rawLabels.some((l: any) => l === undefined);

        if (hasMissingOption) {
          unknown.push(t.name);
          return;
        }

        const labels = rawLabels.map((l: any) => normalize(l as string));
        const hasKonuEksik = labels.includes(KONU_EKSIK_LABEL);
        const hasSoruEksik = labels.includes(SORU_EKSIK_LABEL) || labels.includes(TEK_KAYNAK_LABEL);
        const hasKonuYok = labels.includes(KONU_YOK_LABEL);
        const hasSoruTamam = labels.includes(IKI_KAYNAK_LABEL) || labels.includes(UC_KAYNAK_LABEL);
        const isCompleted = hasKonuYok && !hasKonuEksik && hasSoruTamam && !hasSoruEksik;

        if (hasKonuEksik) konuEksikList.push(t.name);
        if (hasSoruEksik) soruEksikList.push(t.name);
        if (isCompleted) completedList.push(t.name);
      });

      const answeredCount = answeredTopics.length;
      const unansweredCount = total - answeredCount;
      const completedCount = completedList.length;

      return {
        subject: subject.name,
        total,
        answeredCount,
        unansweredCount,
        completedCount,
        completedPct: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        konuEksikList,
        konuEksikPct: total > 0 ? Math.round((konuEksikList.length / total) * 100) : 0,
        soruEksikList,
        soruEksikPct: total > 0 ? Math.round((soruEksikList.length / total) * 100) : 0,
        unknown,
      };
    }).filter((s) => s.answeredCount > 0);

    const totalAll = perSubject.reduce((sum, s) => sum + s.total, 0);
    const totalCompleted = perSubject.reduce((sum, s) => sum + s.completedCount, 0);
    const totalKonuEksik = perSubject.reduce((sum, s) => sum + s.konuEksikList.length, 0);
    const totalSoruEksik = perSubject.reduce((sum, s) => sum + s.soruEksikList.length, 0);
    const totalUnknown = perSubject.reduce((sum, s) => sum + s.unknown.length, 0);
    const totalUnanswered = perSubject.reduce((sum, s) => sum + s.unansweredCount, 0);

    return {
      perSubject,
      totalAll,
      totalCompleted,
      completedPct: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
      totalKonuEksik,
      konuEksikPct: totalAll > 0 ? Math.round((totalKonuEksik / totalAll) * 100) : 0,
      totalSoruEksik,
      soruEksikPct: totalAll > 0 ? Math.round((totalSoruEksik / totalAll) * 100) : 0,
      totalUnknown,
      totalUnanswered,
    };
  }, [subjects, selectedTopicMap, optionById]);

  // ── Seçenek dağılımı (histogram, konu konu değil) ──
  const subjectOptionDistribution = useMemo(() => {
    return subjects.map((subject: any) => {
      const counts = new Map<string, number>();
      let total = 0;
      subject.topics.forEach((t: any) => {
        const topicAnswers = selectedTopicMap.get(t.id);
        if (!topicAnswers) return;
        topicAnswers.forEach((a: any) => {
          if (!a.option_id) return;
          counts.set(a.option_id, (counts.get(a.option_id) ?? 0) + 1);
          total++;
        });
      });
      return { subject: subject.name, id: subject.id, counts, total, topicCount: subject.topics.filter((t: any) => selectedTopicMap.has(t.id)).length };
    }).filter((s) => s.total > 0);
  }, [subjects, selectedTopicMap]);

  function toggleSubject(id: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectResponse(id: string) {
    setSelectedResponseId(id);
    setView('karne');
    setAssigning(false);
  }

  async function assignStudent(studentId: string) {
    if (!studentId || !selectedResponse) return;
    const student = students.find((s: any) => s.id === studentId);
    await (supabase.from('survey_responses') as any)
      .update({ student_id: studentId, match_status: 'manual' })
      .eq('id', selectedResponse.id);

    setResponses((prev: any[]) =>
      prev.map((r) => r.id === selectedResponse.id ? { ...r, student_id: studentId, match_status: 'manual', students: student } : r)
    );
    setAssigning(false);
  }

  async function pushToTopics() {
    if (!selectedResponse?.student_id) return;
    setPushing(true);
    const studentId = selectedResponse.student_id;

    for (const [topicId, topicAnswers] of selectedTopicMap.entries()) {
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

    await (supabase.from('survey_responses') as any).update({ pushed_to_topics: true }).eq('id', selectedResponse.id);
    setPushedIds((prev) => new Set(prev).add(selectedResponse.id));
    setPushing(false);
  }

  async function downloadPdf() {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      // Yakalamadan önce sayfayı en üste al — html2canvas kaydırma pozisyonunu
      // yanlış hesaplayınca içerik bölünmüş/tekrar etmiş gibi görünebiliyor.
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 50));

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const el = reportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      const name = (selectedResponse?.students?.full_name ?? selectedResponse?.entered_name ?? 'karne').replace(/\s+/g, '-');
      pdf.save(`karne-${name}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  // ── Ekran 1: Öğrenci seçimi ──
  if (!selectedResponse) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/anketler" className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <IconArrowLeft size={15} /> Anketler
        </Link>

        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">{survey.title}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)]">
            <IconUsers size={14} /> {responses.length} yanıt — devam etmek için bir öğrenci seç
          </p>
        </div>

        <div className="relative mb-4">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsme göre ara..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-8 pr-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {filteredResponses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center text-[13px] text-[var(--ink-muted)]">
            {responses.length === 0 ? 'Henüz yanıt yok.' : 'Eşleşen öğrenci bulunamadı.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredResponses.map((r: any) => {
              const match = MATCH_LABELS[r.match_status] ?? MATCH_LABELS['unmatched'];
              const displayName = r.students?.full_name ?? r.entered_name;
              return (
                <button
                  key={r.id}
                  onClick={() => selectResponse(r.id)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:border-[var(--accent)]/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-[var(--ink)]">{displayName}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                      {new Date(r.submitted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {pushedIds.has(r.id) && <span className="ml-1.5 text-[var(--success)]">· Aktarıldı</span>}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${match.className}`}>
                    {match.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Ekran 2: Seçilen öğrenci ──
  const displayName = selectedResponse.students?.full_name ?? selectedResponse.entered_name;
  const match = MATCH_LABELS[selectedResponse.match_status] ?? MATCH_LABELS['unmatched'];
  const isPushed = pushedIds.has(selectedResponse.id);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => setSelectedResponseId(null)}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <IconArrowLeft size={15} /> Öğrenci listesi
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-semibold text-[var(--ink)]">{displayName}</h1>
          <p className="text-[12px] text-[var(--ink-muted)]">
            {new Date(selectedResponse.submitted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {selectedResponse.entered_phone && ` · ${selectedResponse.entered_phone}`}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${match.className}`}>
          {match.label}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {selectedResponse.student_id && !assigning ? (
          <>
            <button
              onClick={pushToTopics}
              disabled={pushing}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${
                isPushed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]'
              }`}
            >
              {isPushed ? <IconCheck size={14} /> : <IconArrowRight size={14} />}
              {pushing ? 'Aktarılıyor...' : isPushed ? 'Konu takibine aktarıldı' : 'Konu takibine aktar'}
            </button>
            <button
              onClick={() => setAssigning(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:bg-[var(--paper)]"
            >
              <IconUserPlus size={13} /> Değiştir
            </button>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => assignStudent(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              <option value="" disabled>Öğrenci seç</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            {assigning && (
              <button onClick={() => setAssigning(false)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                Vazgeç
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sekmeler */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--paper)] p-1">
        <button
          onClick={() => setView('karne')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${view === 'karne' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}
        >
          Karne
        </button>
        <button
          onClick={() => setView('cevaplar')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${view === 'cevaplar' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}
        >
          Konu konu detay
        </button>
        <button
          onClick={() => setView('ozet')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${view === 'ozet' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}
        >
          Seçenek dağılımı
        </button>
      </div>

      {/* ── Karne ── */}
      {view === 'karne' && (
        karne.totalAll === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-10 text-center text-[13px] text-[var(--ink-muted)]">
            Bu öğrencinin işaretlediği konu yok.
          </p>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <button
                onClick={downloadPdf}
                disabled={generatingPdf}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)] disabled:opacity-60"
              >
                <IconFileDownload size={15} />
                {generatingPdf ? 'Hazırlanıyor...' : 'PDF olarak indir'}
              </button>
            </div>

            <div ref={reportRef} className="flex flex-col gap-3 p-1" style={{ backgroundColor: KARNE_COLORS.paper }}>
              {/* Genel özet paneli */}
              <div className="rounded-2xl border px-5 py-5" style={{ backgroundColor: KARNE_COLORS.card, borderColor: KARNE_COLORS.border }}>
                <div className="mb-1 text-[12px] font-medium" style={{ color: KARNE_COLORS.inkMuted }}>{survey.title}</div>
                <div className="mb-4 text-[17px] font-bold tracking-tight" style={{ color: KARNE_COLORS.ink }}>{displayName} — Genel Karne</div>

                <div className="flex flex-wrap items-center gap-5">
                  <Donut pct={karne.completedPct} color={KARNE_COLORS.success} trackColor={KARNE_COLORS.paper} textColor={KARNE_COLORS.ink} />
                  <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: KARNE_COLORS.paper }}>
                      <div className="text-[18px] font-bold" style={{ color: KARNE_COLORS.ink }}>{karne.totalCompleted}/{karne.totalAll}</div>
                      <div className="text-[10.5px] font-medium" style={{ color: KARNE_COLORS.inkMuted }}>Tamamlanan konu</div>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: KARNE_COLORS.dangerSoft }}>
                      <div className="text-[18px] font-bold" style={{ color: KARNE_COLORS.danger }}>%{karne.konuEksikPct}</div>
                      <div className="text-[10.5px] font-medium" style={{ color: KARNE_COLORS.danger }}>Konu eksiği</div>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: KARNE_COLORS.accentSoft }}>
                      <div className="text-[18px] font-bold" style={{ color: KARNE_COLORS.accentDark }}>%{karne.soruEksikPct}</div>
                      <div className="text-[10.5px] font-medium" style={{ color: KARNE_COLORS.accentDark }}>Soru eksiği</div>
                    </div>
                    {karne.totalUnanswered > 0 && (
                      <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: KARNE_COLORS.paper }}>
                        <div className="text-[18px] font-bold" style={{ color: KARNE_COLORS.inkMuted }}>{karne.totalUnanswered}</div>
                        <div className="text-[10.5px] font-medium" style={{ color: KARNE_COLORS.inkMuted }}>Cevaplanmamış konu</div>
                      </div>
                    )}
                  </div>
                </div>

                {karne.totalUnknown > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-medium" style={{ backgroundColor: KARNE_COLORS.dangerSoft, color: KARNE_COLORS.danger }}>
                    <IconAlertTriangle size={13} /> {karne.totalUnknown} konuda seçenek verisi eksik — kontrol edilmeli
                  </div>
                )}
              </div>

              {/* Ders bazlı kartlar */}
              <div className="grid gap-3 sm:grid-cols-2">
                {karne.perSubject.map((s) => (
                  <div key={s.subject} className="rounded-2xl border px-4 py-4" style={{ backgroundColor: KARNE_COLORS.card, borderColor: KARNE_COLORS.border }}>
                    <div className="mb-3 flex items-center gap-3">
                      <Donut
                        pct={s.completedPct}
                        size={54}
                        stroke={6}
                        color={s.completedPct >= 70 ? KARNE_COLORS.success : s.completedPct >= 40 ? KARNE_COLORS.accent : KARNE_COLORS.danger}
                        trackColor={KARNE_COLORS.paper}
                        textColor={KARNE_COLORS.ink}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[13.5px] font-semibold leading-snug" style={{ color: KARNE_COLORS.ink }}>{s.subject}</div>
                        <div className="text-[11.5px]" style={{ color: KARNE_COLORS.inkMuted }}>{s.completedCount}/{s.total} konu tamamlandı</div>
                      </div>
                    </div>

                    <SegmentBar
                      trackColor={KARNE_COLORS.paper}
                      segments={[
                        { pct: s.completedPct, color: KARNE_COLORS.success },
                        { pct: s.konuEksikPct, color: KARNE_COLORS.danger },
                        { pct: s.soruEksikPct, color: KARNE_COLORS.accent },
                      ]}
                    />

                    {(s.konuEksikList.length > 0 || s.soruEksikList.length > 0 || s.unknown.length > 0) && (
                      <div className="mt-3 flex flex-col gap-2.5 border-t pt-3" style={{ borderColor: KARNE_COLORS.border }}>
                        <IssueList title="Konu eksiği" items={s.konuEksikList} color={KARNE_COLORS.danger} softColor={KARNE_COLORS.dangerSoft} />
                        <IssueList title="Soru eksiği" items={s.soruEksikList} color={KARNE_COLORS.accentDark} softColor={KARNE_COLORS.accentSoft} />
                        <IssueList title="Kontrol gerekiyor" items={s.unknown} color={KARNE_COLORS.danger} softColor={KARNE_COLORS.dangerSoft} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}

      {/* ── Konu konu detay ── */}
      {view === 'cevaplar' && (
        selectedTopicMap.size === 0 && selectedOpenTexts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-10 text-center text-[13px] text-[var(--ink-muted)]">
            Bu öğrencinin işaretlediği konu yok.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map((subject: any) => {
              const rows = subject.topics.filter((t: any) => selectedTopicMap.has(t.id));
              if (rows.length === 0) return null;
              return (
                <div key={subject.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                  <div className="mb-2 text-[13px] font-semibold text-[var(--ink)]">{subject.name}</div>
                  <div className="flex flex-col gap-1.5">
                    {rows.map((t: any) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                        <span className="font-medium text-[var(--ink)]">{t.name}:</span>
                        {selectedTopicMap.get(t.id)!.map((a: any) => (
                          <span key={a.id} className="rounded-full bg-[var(--track-yks-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--track-yks)]">
                            {optionById.get(a.option_id)?.label ?? '—'}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {selectedOpenTexts.map((t, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                <div className="mb-1 text-[13px] font-semibold text-[var(--ink)]">{t.label}</div>
                <div className="text-[12.5px] text-[var(--ink-muted)]">{t.value}</div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Seçenek dağılımı ── */}
      {view === 'ozet' && (
        subjectOptionDistribution.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-10 text-center text-[13px] text-[var(--ink-muted)]">
            Bu öğrencinin işaretlediği konu yok.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {subjectOptionDistribution.map((s) => {
              const isOpen = expandedSubjects.has(s.id);
              return (
                <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <button onClick={() => toggleSubject(s.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <span className="text-[14px] font-semibold text-[var(--ink)]">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--ink-muted)]">{s.topicCount} konu · {s.total} işaret</span>
                      <IconChevronDown size={16} className={`text-[var(--ink-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--border)] px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {options.map((opt: any) => {
                          const count = s.counts.get(opt.id) ?? 0;
                          if (count === 0) return null;
                          const pct = Math.round((count / s.total) * 100);
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <span className="w-44 flex-shrink-0 truncate text-[11.5px] text-[var(--ink-muted)]">{opt.label}</span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper)]">
                                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-8 flex-shrink-0 text-right text-[11px] font-medium text-[var(--ink-muted)]">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}