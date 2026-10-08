/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconTrash, IconPlus, IconDownload, IconPrinter, IconCopy, IconX, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const TRACK_RESOURCES: Record<string, string[]> = {
  YKS_SAY: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji',
  ],
  YKS_EA: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya',
  ],
  YKS_SOZ: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya', 'AYT Felsefe', 'AYT Din Kültürü',
  ],
  YKS_DIL: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü', 'YDT İngilizce',
  ],
  LGS: [
    'Türkçe', 'Paragraf', 'Matematik', 'Fen Bilgisi',
    'İnkılap Tarihi', 'Din Kültürü', 'İngilizce',
  ],
  DIGER: [],
};

function getWeekStartDate(weekStartDay: number): Date {
  const now = new Date();
  const todayDay = (now.getDay() + 6) % 7;
  let diff = todayDay - weekStartDay;
  if (diff < 0) diff += 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}


// Yerel tarih (toISOString UTC'ye çevirip günü kaydırıyordu)
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function addDaysToDateStr(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

function getWeekEndFromStart(dateStr: string) {
  return addDaysToDateStr(dateStr, 6);
}

function getNextBlankProgramStartFromOptions(options: ProgramOption[], weekStartDay: number) {
  const taken = new Set(options.map((p) => p.weekStart));
  let candidate = toDateStr(getWeekStartDate(weekStartDay));
  while (taken.has(candidate)) {
    candidate = addDaysToDateStr(candidate, 7);
  }
  return candidate;
}

function ProgressBar({ done, target }: { done: number; target: number }) {
  if (target === 0) return null;
  const normalPct = Math.min((done / target) * 100, 100);
  const extraPct = done > target ? Math.min(((done - target) / target) * 100, 100) : 0;
  const color =
    normalPct >= 80 ? 'bg-[var(--success)]' : normalPct >= 50 ? 'bg-[var(--accent)]' : 'bg-[var(--danger)]';

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--paper)]">
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
        style={{ width: `${normalPct}%` }}
      />
      {extraPct > 0 && (
        <div
          className="absolute top-0 h-full rounded-full bg-[var(--track-lgs)] opacity-70 transition-all"
          style={{ left: `${normalPct - extraPct * (normalPct / 100)}%`, width: `${extraPct}%` }}
        />
      )}
    </div>
  );
}

type Draft = {
  subject: string;
  resource: string;
  topic: string;
  target: string;
  topicTarget: string;
  startTime: string;
  endTime: string;
  days: number[];
};

type EditDraft = Omit<Draft, 'days'> & { planDay: string };

type ProgramOption = {
  weekStart: string;
  weekEnd: string;
  count: number;
};

const inputCls =
  'w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

export default function HaftalikTakipPage() {
  const router = useRouter();
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceMap, setResourceMap] = useState<Record<string, string[]>>({});
  const filteredStudents = students.filter((s) => matchesFilter(s));
  const [sinifFilter, setSinifFilter] = useState('');
  const availableSiniflar = Array.from(
    new Set(filteredStudents.map((s: any) => s.sinif_sube).filter(Boolean))
  ).sort();
  const pickerStudents = sinifFilter
    ? filteredStudents.filter((s: any) => s.sinif_sube === sinifFilter)
    : filteredStudents;

  // Günün içinde açılan ekleme formu
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({
    subject: '', resource: '', topic: '', target: '', topicTarget: '', startTime: '', endTime: '', days: [],
  });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    subject: '', resource: '', topic: '', target: '', topicTarget: '', startTime: '', endTime: '', planDay: '0',
  });

  // Kopyalama
  const [copyPopoverLogId, setCopyPopoverLogId] = useState<string | null>(null);
  const [copyDaysSelected, setCopyDaysSelected] = useState<number[]>([]);

  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [activeProgramWeek, setActiveProgramWeek] = useState('');
  const [programPromptWeek, setProgramPromptWeek] = useState('');
  const [creatingProgram, setCreatingProgram] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const includeInterns = document.cookie.split('; ').includes('show_interns=1');
      const scope = await getStudentScope(supabase, user.id, includeInterns);
      const { data } = await applyStudentScope(
        (supabase as any)
          .from('students')
          .select('id, full_name, resources, week_start_day, track, kurum, donem, sinif_sube, coach_id, responsible_coach_id, responsible_coach_other_name')
          .neq('status', 'pasif')
          .order('full_name'),
        scope
      );
      setStudents(data ?? []);
      const pre = new URLSearchParams(window.location.search).get('ogrenci');
      if (data?.length) {
        setSelectedStudentId(pre && data.some((s: any) => s.id === pre) ? pre : data[0].id);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    const st = students.find((s) => s.id === selectedStudentId) ?? null;
    setSelectedStudent(st);

    const startDay = st?.week_start_day ?? 0;
    const params = new URLSearchParams(window.location.search);
    const programParam = params.get('program');
    const studentParam = params.get('ogrenci');
    setLogs([]);
    setWeekStart('');
    setWeekEnd('');
    loadProgramOptions(selectedStudentId).then((options) => {
      const shouldOpenExisting = programParam && (!studentParam || studentParam === selectedStudentId);
      const initialWeekStart = shouldOpenExisting
        ? programParam
        : getNextBlankProgramStartFromOptions(options, startDay);
      const selectedProgram = options.find((p) => p.weekStart === initialWeekStart);
      setWeekStart(initialWeekStart);
      setWeekEnd(selectedProgram?.weekEnd || getWeekEndFromStart(initialWeekStart));
      setActiveProgramWeek(shouldOpenExisting ? initialWeekStart : '');
      setProgramPromptWeek(shouldOpenExisting ? initialWeekStart : '');
    });

    const rm: Record<string, string[]> = {};
    if (st?.resources) {
      for (const [subject, sources] of Object.entries(st.resources as Record<string, string[]>)) {
        const filtered = (sources as string[]).filter((s) => s.trim() !== '');
        if (filtered.length > 0) rm[subject] = filtered;
      }
    }
    setResourceMap(rm);
    setAddingDay(null);
    setEditingLogId(null);
    setFormError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (pickerStudents.length === 0) {
      setSelectedStudentId('');
      return;
    }
    if (!pickerStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(pickerStudents[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerStudents]);

  useEffect(() => {
    if (!selectedStudentId || !weekStart) return;
    loadLogs(selectedStudentId, weekStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, weekStart]);

  async function loadLogs(studentId: string, ws: string) {
    const { data } = await (supabase as any)
      .from('question_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start', ws);
    setLogs(data ?? []);
    if (data?.[0]?.week_end) setWeekEnd(data[0].week_end);
  }

  async function loadProgramOptions(studentId: string) {
    const { data } = await (supabase as any)
      .from('question_logs')
      .select('week_start, week_end')
      .eq('student_id', studentId)
      .order('week_start', { ascending: false });

    const map = new Map<string, ProgramOption>();
    for (const row of data ?? []) {
      if (!row.week_start) continue;
      const existing = map.get(row.week_start);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(row.week_start, {
          weekStart: row.week_start,
          weekEnd: row.week_end || getWeekEndFromStart(row.week_start),
          count: 1,
        });
      }
    }
    const options = Array.from(map.values());
    setProgramOptions(options);
    return options;
  }

  function getNextBlankProgramStart() {
    return getNextBlankProgramStartFromOptions(programOptions, selectedStudent?.week_start_day ?? 0);
  }

  function startBlankProgram() {
    const nextWeekStart = getNextBlankProgramStart();
    setWeekStart(nextWeekStart);
    setWeekEnd(getWeekEndFromStart(nextWeekStart));
    setLogs([]);
    setActiveProgramWeek('');
    setProgramPromptWeek('');
    setAddingDay(null);
    setEditingLogId(null);
    setFormError('');
  }

  function handleProgramSelect(value: string) {
    setFormError('');
    setAddingDay(null);
    setEditingLogId(null);
    if (!value) {
      startBlankProgram();
      return;
    }
    const selected = programOptions.find((p) => p.weekStart === value);
    setWeekStart(value);
    setWeekEnd(selected?.weekEnd || getWeekEndFromStart(value));
    setActiveProgramWeek(value);
    setProgramPromptWeek(value);
  }

  async function rebuildProgramFromCurrent() {
    if (!selectedStudentId || logs.length === 0) return;
    setCreatingProgram(true);
    setFormError('');
    const { data: { user } } = await supabase.auth.getUser();
    const nextWeekStart = getNextBlankProgramStart();
    const nextWeekEnd = getWeekEndFromStart(nextWeekStart);
    const rows = logs.map((log) => ({
      student_id: selectedStudentId,
      coach_id: user?.id,
      subject: log.subject,
      resource_name: log.resource_name,
      topic: log.topic,
      week_start: nextWeekStart,
      week_end: nextWeekEnd,
      plan_day: log.plan_day,
      start_time: log.start_time,
      end_time: log.end_time,
      target_count: log.target_count ?? 0,
      done_count: 0,
      topic_target_minutes: log.topic_target_minutes,
      topic_done_minutes: 0,
    }));
    const { data, error } = await (supabase as any).from('question_logs').insert(rows).select();
    setCreatingProgram(false);
    if (error) {
      setFormError(weeklyPlanErrorMessage(error));
      return;
    }
    setWeekStart(nextWeekStart);
    setWeekEnd(nextWeekEnd);
    setLogs(data ?? []);
    setActiveProgramWeek(nextWeekStart);
    setProgramPromptWeek('');
    await loadProgramOptions(selectedStudentId);
  }

  function finishProgram() {
    if (!selectedStudentId) return;
    setLogs([]);
    setAddingDay(null);
    setEditingLogId(null);
    setDraft({ subject: '', resource: '', topic: '', target: '', topicTarget: '', startTime: '', endTime: '', days: [] });
    router.push('/ogrenciler/' + selectedStudentId);
    router.refresh();
  }

  async function syncFromDailyLogs() {
    if (!selectedStudentId || !weekStart || !weekEnd) return;
    const { data: dailyLogs } = await (supabase as any)
      .from('daily_logs')
      .select('question_solved, topic_studies, log_date')
      .eq('student_id', selectedStudentId)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd);

    if (!dailyLogs) return;

    const subjectTotals: Record<string, number> = {};
    const topicTotals: Record<string, number> = {};
    const topicMinutes: Record<string, number> = {};

    for (const dl of dailyLogs) {
      for (const q of (dl.question_solved ?? [])) {
        const key = q.subject ?? q.topic;
        subjectTotals[key] = (subjectTotals[key] ?? 0) + (q.count ?? 0);
        const topicKey = `${q.subject}__${q.topic}`;
        topicTotals[topicKey] = (topicTotals[topicKey] ?? 0) + (q.count ?? 0);
      }
      for (const t of (dl.topic_studies ?? [])) {
        const topicKey = `${t.subject}__${t.topic}`;
        topicMinutes[topicKey] = (topicMinutes[topicKey] ?? 0) + (t.duration_minutes ?? 0);
      }
    }

    for (const log of logs) {
      let newDone = 0;
      let newTopicDone = 0;

      if (log.topic) {
        const topicKey = `${log.subject}__${log.topic}`;
        newDone = topicTotals[topicKey] ?? 0;
        newTopicDone = topicMinutes[topicKey] ?? 0;
      } else {
        for (const [key, val] of Object.entries(subjectTotals)) {
          if (key.toLowerCase().includes(log.subject.toLowerCase()) ||
              log.subject.toLowerCase().includes(key.toLowerCase())) {
            newDone += val;
          }
        }
      }

      if (newDone !== log.done_count || newTopicDone !== (log.topic_done_minutes ?? 0)) {
        await (supabase as any)
          .from('question_logs')
          .update({ done_count: newDone, topic_done_minutes: newTopicDone })
          .eq('id', log.id);
      }
    }

    loadLogs(selectedStudentId, weekStart);
  }

  const subjects = selectedStudent?.track
    ? (TRACK_RESOURCES[selectedStudent.track] ?? Object.keys(resourceMap))
    : Object.keys(resourceMap);

  // ── Kolon içi ekleme formu ──
  function openAdd(day: number) {
    const firstSubject = subjects[0] ?? '';
    setDraft({
      subject: firstSubject,
      resource: resourceMap[firstSubject]?.[0] ?? '',
      topic: '',
      target: '',
      topicTarget: '',
      startTime: '',
      endTime: '',
      days: [day],
    });
    setFormError('');
    setAddingDay(day);
  }

  function setDraftSubject(subject: string) {
    setDraft((d) => ({ ...d, subject, resource: resourceMap[subject]?.[0] ?? '' }));
  }

  function toggleDraftDay(day: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day].sort((a, b) => a - b),
    }));
  }

  function weeklyPlanErrorMessage(error: { message?: string; code?: string; details?: string } | null) {
    const raw = [error?.message, error?.details, error?.code].filter(Boolean).join(' ');
    if (raw.includes('question_logs_student_id_subject_week_start_key') || error?.code === '23505') {
      return 'Aynı hafta içinde aynı dersten birden fazla görev ekleyebilmek için Supabase’te weekly_tracking_schedule.sql dosyasını çalıştırmalısınız.';
    }
    if (raw.includes('plan_day') || raw.includes('start_time') || raw.includes('end_time')) {
      return 'Gün ve saat alanları veritabanında yok. Supabase’te weekly_tracking_schedule.sql dosyasını çalıştırmalısınız.';
    }
    return error?.message || 'Hedef eklenirken bir hata oluştu.';
  }

  async function addLogs() {
    setFormError('');
    if (!selectedStudentId || !draft.subject) {
      setFormError('Ders seçmelisiniz.');
      return;
    }
    if (draft.days.length === 0) {
      setFormError('En az bir gün seçmelisiniz.');
      return;
    }

    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const targetCount = draft.target ? Number(draft.target) : 0;

    const rows = draft.days.map((day) => ({
      student_id: selectedStudentId,
      coach_id: user?.id,
      subject: draft.subject,
      resource_name: draft.resource || null,
      topic: draft.topic || null,
      week_start: weekStart,
      week_end: weekEnd,
      plan_day: day,
      start_time: draft.startTime || null,
      end_time: draft.endTime || null,
      target_count: Number.isFinite(targetCount) ? targetCount : 0,
      done_count: 0,
      topic_target_minutes: draft.topicTarget ? Number(draft.topicTarget) : null,
      topic_done_minutes: 0,
    }));

    const { data, error } = await (supabase as any).from('question_logs').insert(rows).select();
    setAdding(false);

    if (error) {
      setFormError(weeklyPlanErrorMessage(error));
      return;
    }
    if (data) {
      setLogs((prev) => [...prev, ...data]);
      setAddingDay(null);
      setActiveProgramWeek(weekStart);
      await loadProgramOptions(selectedStudentId);
    }
  }

  async function deleteLog(id: string) {
    await (supabase as any).from('question_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (selectedStudentId) await loadProgramOptions(selectedStudentId);
  }

  async function updateLogSchedule(id: string, updates: { plan_day?: number; start_time?: string | null; end_time?: string | null }) {
    await (supabase as any).from('question_logs').update(updates).eq('id', id);
    setLogs((prev) => prev.map((log) => (log.id === id ? { ...log, ...updates } : log)));
  }

  function openEdit(log: any) {
    setFormError('');
    setEditingLogId(log.id);
    setEditDraft({
      subject: log.subject ?? '',
      resource: log.resource_name ?? '',
      topic: log.topic ?? '',
      target: log.target_count ? String(log.target_count) : '',
      topicTarget: log.topic_target_minutes ? String(log.topic_target_minutes) : '',
      startTime: log.start_time?.slice(0, 5) ?? '',
      endTime: log.end_time?.slice(0, 5) ?? '',
      planDay: typeof log.plan_day === 'number' ? String(log.plan_day) : '0',
    });
  }

  async function saveEdit(id: string) {
    const targetCount = editDraft.target ? Number(editDraft.target) : 0;
    const topicTarget = editDraft.topicTarget ? Number(editDraft.topicTarget) : null;
    const updates = {
      subject: editDraft.subject,
      resource_name: editDraft.resource || null,
      topic: editDraft.topic || null,
      plan_day: Number(editDraft.planDay),
      start_time: editDraft.startTime || null,
      end_time: editDraft.endTime || null,
      target_count: Number.isFinite(targetCount) ? targetCount : 0,
      topic_target_minutes: topicTarget,
    };
    const { error } = await (supabase as any).from('question_logs').update(updates).eq('id', id);
    if (error) {
      setFormError(weeklyPlanErrorMessage(error));
      return;
    }
    setLogs((prev) => prev.map((log) => (log.id === id ? { ...log, ...updates } : log)));
    setEditingLogId(null);
    if (selectedStudentId) await loadProgramOptions(selectedStudentId);
  }

  async function updateWeekStartDay(day: number) {
    await (supabase as any)
      .from('students')
      .update({ week_start_day: day })
      .eq('id', selectedStudentId);
    setStudents((prev) => prev.map((s) =>
      s.id === selectedStudentId ? { ...s, week_start_day: day } : s
    ));
  }

  // ── Mevcut hedefi diğer günlere kopyala ──
  function openCopyPopover(log: any) {
    setCopyPopoverLogId(log.id);
    setCopyDaysSelected([]);
  }

  function toggleCopyDay(day: number) {
    setCopyDaysSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function confirmCopy(log: any) {
    if (copyDaysSelected.length === 0) { setCopyPopoverLogId(null); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const rows = copyDaysSelected.map((day) => ({
      student_id: log.student_id,
      coach_id: user?.id,
      subject: log.subject,
      resource_name: log.resource_name,
      topic: log.topic,
      week_start: log.week_start,
      week_end: log.week_end,
      plan_day: day,
      start_time: log.start_time,
      end_time: log.end_time,
      target_count: log.target_count,
      done_count: 0,
      topic_target_minutes: log.topic_target_minutes,
      topic_done_minutes: 0,
    }));
    const { data, error } = await (supabase as any).from('question_logs').insert(rows).select();
    if (error) {
      setFormError(weeklyPlanErrorMessage(error));
    } else if (data) {
      setLogs((prev) => [...prev, ...data]);
      await loadProgramOptions(selectedStudentId);
    }
    setCopyPopoverLogId(null);
  }

  function generateReport() {
    const lines: string[] = [];
    lines.push(`📊 Haftalık Rapor — ${selectedStudent?.full_name}`);
    lines.push(`📅 ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`);
    lines.push('');

    for (const log of logs) {
      const pct = log.target_count > 0 ? Math.round((log.done_count / log.target_count) * 100) : 0;
      const status = pct >= 100 ? '✅' : pct >= 50 ? '🟡' : '🔴';
      lines.push(`${status} ${log.subject}${log.topic ? ` · ${log.topic}` : ''}`);
      lines.push(`   Soru: ${log.done_count}/${log.target_count} (%${pct})`);
      if (log.topic_target_minutes) {
        const topicPct = Math.round((log.topic_done_minutes / log.topic_target_minutes) * 100);
        lines.push(`   Konu çalışma: ${log.topic_done_minutes}/${log.topic_target_minutes} dk (%${topicPct})`);
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapor-${selectedStudent?.full_name}-${weekStart}.txt`;
    a.click();
  }

  const weekLabel = weekStart ? `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}` : '';

  const sortedLogs = [...logs].sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    if (a.start_time) return -1;
    if (b.start_time) return 1;
    if (a.end_time && b.end_time) return a.end_time.localeCompare(b.end_time);
    return 0;
  });
  const plannedLogsByDay = DAYS_TR.map((_, i) => sortedLogs.filter((l) => l.plan_day === i));
  const unscheduledLogs = sortedLogs.filter((l) => typeof l.plan_day !== 'number');

  function renderLogCard(log: any) {
    const pct = log.target_count > 0 ? Math.round((log.done_count / log.target_count) * 100) : 0;
    const isOver = log.done_count > log.target_count;
    const isCopyOpen = copyPopoverLogId === log.id;
    const isEditing = editingLogId === log.id;

    if (isEditing) {
      return (
        <div key={log.id} className="log-card relative space-y-1.5 rounded-lg border border-[var(--accent)] bg-[var(--card)] p-2">
          <div className="no-print flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--ink)]">Görevi düzenle</span>
            <button onClick={() => setEditingLogId(null)} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              <IconX size={13} />
            </button>
          </div>
          <select value={editDraft.subject} onChange={(e) => setEditDraft((d) => ({ ...d, subject: e.target.value, resource: resourceMap[e.target.value]?.[0] ?? '' }))} className={inputCls}>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={editDraft.resource} onChange={(e) => setEditDraft((d) => ({ ...d, resource: e.target.value }))} className={inputCls}>
            <option value="">Kaynak yok</option>
            {(resourceMap[editDraft.subject] ?? []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={editDraft.topic} onChange={(e) => setEditDraft((d) => ({ ...d, topic: e.target.value }))} placeholder="Konu" className={inputCls} />
          <div className="grid grid-cols-2 gap-1.5">
            <select value={editDraft.planDay} onChange={(e) => setEditDraft((d) => ({ ...d, planDay: e.target.value }))} className={inputCls}>
              {DAYS_TR.map((day, i) => <option key={day} value={i}>{day}</option>)}
            </select>
            <input type="number" value={editDraft.target} onChange={(e) => setEditDraft((d) => ({ ...d, target: e.target.value }))} placeholder="Soru" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="time" value={editDraft.startTime} onChange={(e) => setEditDraft((d) => ({ ...d, startTime: e.target.value }))} title="Başlangıç saati" className={inputCls} />
            <input type="time" value={editDraft.endTime} onChange={(e) => setEditDraft((d) => ({ ...d, endTime: e.target.value }))} title="Bitiş saati" className={inputCls} />
          </div>
          <input type="number" value={editDraft.topicTarget} onChange={(e) => setEditDraft((d) => ({ ...d, topicTarget: e.target.value }))} placeholder="Çalışma süresi (dk)" className={inputCls} />
          {formError && <p className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">{formError}</p>}
          <button onClick={() => saveEdit(log.id)} className="flex w-full items-center justify-center gap-1 rounded-md bg-[var(--accent)] py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            <IconDeviceFloppy size={13} /> Kaydet
          </button>
        </div>
      );
    }

    return (
      <div key={log.id} className="log-card relative rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <span className="block text-[12px] font-medium leading-tight text-[var(--ink)]">{log.subject}</span>
            {log.topic && (
              <span className="block text-[11px] leading-tight text-[var(--ink-muted)]">{log.topic}</span>
            )}
            {log.resource_name && (
              <span className="block text-[10px] leading-tight text-[var(--ink-muted)]">{log.resource_name}</span>
            )}
          </div>
          <div className="no-print flex flex-shrink-0 items-center gap-1">
            <button onClick={() => openCopyPopover(log)} title="Diğer günlere kopyala" className="text-[var(--ink-muted)] hover:text-[var(--accent)]">
              <IconCopy size={13} />
            </button>
            <button onClick={() => openEdit(log)} title="Düzenle" className="text-[var(--ink-muted)] hover:text-[var(--accent)]">
              <IconEdit size={13} />
            </button>
            <button onClick={() => deleteLog(log.id)} title="Sil" className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
              <IconTrash size={13} />
            </button>
          </div>
        </div>

        {isCopyOpen && (
          <div className="no-print absolute right-0 top-7 z-20 w-44 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
            <p className="mb-1.5 text-[11px] font-medium text-[var(--ink-muted)]">Hangi günlere kopyalansın?</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {DAYS_SHORT.map((d, i) =>
                i === log.plan_day ? null : (
                  <button
                    key={d}
                    onClick={() => toggleCopyDay(i)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      copyDaysSelected.includes(i) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setCopyPopoverLogId(null)} className="flex-1 rounded-md border border-[var(--border)] py-1 text-[11px] text-[var(--ink-muted)]">
                Vazgeç
              </button>
              <button onClick={() => confirmCopy(log)} className="flex-1 rounded-md bg-[var(--accent)] py-1 text-[11px] font-medium text-white">
                Kopyala
              </button>
            </div>
          </div>
        )}

        {/* Ekranda: saat girişi */}
        <div className="no-print mt-1.5 flex flex-wrap items-center gap-1">
          <input
            type="time"
            value={log.start_time?.slice(0, 5) ?? ''}
            onChange={(e) => updateLogSchedule(log.id, { start_time: e.target.value || null })}
            title="Başlangıç saati"
            className="w-[4.5rem] rounded-md border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="time"
            value={log.end_time?.slice(0, 5) ?? ''}
            onChange={(e) => updateLogSchedule(log.id, { end_time: e.target.value || null })}
            title="Bitiş saati"
            className="w-[4.5rem] rounded-md border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <span className={`ml-auto text-[11px] font-medium ${isOver ? 'text-[var(--track-lgs)]' : pct >= 100 ? 'text-[var(--success)]' : 'text-[var(--ink-muted)]'}`}>
            {log.done_count}/{log.target_count}
            {isOver && <span className="ml-0.5 text-[10px]">+{log.done_count - log.target_count}</span>}
          </span>
        </div>
        <div className="no-print mt-1">
          <ProgressBar done={log.done_count} target={log.target_count} />
        </div>
        {log.topic_target_minutes > 0 && (
          <div className="no-print mt-1 text-[10px] text-[var(--ink-muted)]">
            Konu: {log.topic_done_minutes ?? 0}/{log.topic_target_minutes} dk
          </div>
        )}

        {/* Yazdırmada: sade çıktı */}
        <div className="print-only mt-1 items-center justify-between text-[11px] text-black">
          <span>{[log.start_time?.slice(0, 5), log.end_time?.slice(0, 5)].filter(Boolean).join(' - ')}</span>
          <span>
            {log.target_count > 0 ? `☐ ${log.target_count} soru` : ''}
            {log.topic_target_minutes > 0 ? ` ☐ ${log.topic_target_minutes} dk` : ''}
          </span>
        </div>
      </div>
    );
  }

  function renderAddForm(day: number) {
    return (
      <div className="no-print mt-2 space-y-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--card)] p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--ink)]">{DAYS_TR[day]} · yeni hedef</span>
          <button onClick={() => setAddingDay(null)} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
            <IconX size={13} />
          </button>
        </div>

        <select value={draft.subject} onChange={(e) => setDraftSubject(e.target.value)} className={inputCls}>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={draft.resource} onChange={(e) => setDraft((d) => ({ ...d, resource: e.target.value }))} className={inputCls}>
          <option value="">Kaynak yok</option>
          {(resourceMap[draft.subject] ?? []).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <input
          type="text"
          value={draft.topic}
          onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
          placeholder="Konu (opsiyonel)"
          className={inputCls}
        />

        <input
          type="number"
          value={draft.target}
          onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
          placeholder="Soru sayısı"
          className={inputCls}
        />

        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="time"
            value={draft.startTime}
            onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
            title="Başlangıç saati"
            className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="time"
            value={draft.endTime}
            onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
            title="Bitiş saati"
            className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {draft.topic && (
          <input
            type="number"
            value={draft.topicTarget}
            onChange={(e) => setDraft((d) => ({ ...d, topicTarget: e.target.value }))}
            placeholder="Çalışma süresi (dk)"
            className={inputCls}
          />
        )}

        <div>
          <p className="mb-1 text-[10px] text-[var(--ink-muted)]">Şu günlere ekle:</p>
          <div className="flex flex-wrap gap-1">
            {DAYS_SHORT.map((d, i) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDraftDay(i)}
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  draft.days.includes(i)
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {formError && <p className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">{formError}</p>}

        <button
          onClick={addLogs}
          disabled={adding}
          className="w-full rounded-md bg-[var(--accent)] py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
        >
          {adding ? 'Ekleniyor...' : `Ekle${draft.days.length > 1 ? ` (${draft.days.length} güne)` : ''}`}
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-[13px] text-[var(--ink-muted)]">Yükleniyor...</div>;

  return (
    <div className="print-root mx-auto w-full max-w-[1600px]">
      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, nav, header { display: none !important; }
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          .print-root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .print-board { min-width: 0 !important; gap: 4px !important; }
          .day-col { min-height: 0 !important; break-inside: avoid; border: 1px solid #999; background: white !important; }
          .log-card { break-inside: avoid; border: 1px solid #bbb !important; background: white !important; }
        }
      `}</style>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">
            Haftalık Program{selectedStudent ? ` — ${selectedStudent.full_name}` : ''}
          </h1>
          {weekLabel && <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{weekLabel}</p>}
        </div>
        <div className="no-print flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <IconPrinter size={13} /> Yazdır
          </button>
          <button
            onClick={syncFromDailyLogs}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            🔄 WhatsApp&apos;tan güncelle
          </button>
          {logs.length > 0 && (
            <button
              onClick={generateReport}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            >
              <IconDownload size={13} /> Rapor al
            </button>
          )}
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-muted)]">Henüz öğrenci eklenmemiş.</p>
      ) : (
        <>
          <div className="no-print mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {availableSiniflar.length > 0 && (
              <select
                value={sinifFilter}
                onChange={(e) => setSinifFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none sm:w-44"
              >
                <option value="">Tüm sınıflar</option>
                {availableSiniflar.map((s) => <option key={s} value={s}>{s}</option>)}
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
                {pickerStudents.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}
            {selectedStudent && (
              <select
                value={programOptions.some((p) => p.weekStart === activeProgramWeek) ? activeProgramWeek : ''}
                onChange={(e) => handleProgramSelect(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none sm:w-72"
              >
                <option value="">Yeni program oluştur</option>
                {programOptions.map((p) => (
                  <option key={p.weekStart} value={p.weekStart}>
                    {fmtDate(p.weekStart)} - {fmtDate(p.weekEnd)} ({p.count} görev)
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedStudent && (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 print:border-none print:p-0">
              {programPromptWeek && (
                <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--ink)]">Seçilen program yüklendi.</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Bu kaydı doğrudan düzenleyebilir veya aynı planı yeni bir programa kopyalayabilirsiniz.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProgramPromptWeek('')}
                      className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
                    >
                      Programı Düzenle
                    </button>
                    <button
                      onClick={rebuildProgramFromCurrent}
                      disabled={creatingProgram || logs.length === 0}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
                    >
                      {creatingProgram ? 'Hazırlanıyor...' : 'Yeniden Yap'}
                    </button>
                  </div>
                </div>
              )}

              <div className="no-print flex items-center gap-3">
                <span className="flex-shrink-0 text-[12px] text-[var(--ink-muted)]">Hafta başlangıcı:</span>
                <div className="flex flex-wrap gap-1">
                  {DAYS_SHORT.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => updateWeekStartDay(i)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        (selectedStudent?.week_start_day ?? 0) === i
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {subjects.length === 0 && (
                  <span className="text-[12px] text-[var(--danger)]">Bu öğrencinin türüne ait ders/kaynak bulunamadı.</span>
                )}
              </div>

              {/* 7 günlük tek ekran pano */}
              <div className="overflow-x-auto pb-1 print:overflow-visible">
                <div className="print-board grid min-w-[1100px] grid-cols-7 gap-2">
                  {DAYS_TR.map((day, i) => {
                    const dayLogs = plannedLogsByDay[i];
                    return (
                      <div key={day} className="day-col flex min-h-[320px] flex-col rounded-lg bg-[var(--paper)] p-1.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-[var(--ink)]">{day}</span>
                          <button
                            onClick={() => (addingDay === i ? setAddingDay(null) : openAdd(i))}
                            disabled={subjects.length === 0}
                            title={`${day} gününe hedef ekle`}
                            className="no-print flex items-center gap-0.5 rounded-md bg-[var(--card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-dark)] hover:bg-[var(--accent)] hover:text-white disabled:opacity-40"
                          >
                            <IconPlus size={12} /> Ekle
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {dayLogs.map(renderLogCard)}
                          {dayLogs.length === 0 && addingDay !== i && (
                            <p className="no-print py-6 text-center text-[11px] text-[var(--ink-muted)]">Boş</p>
                          )}
                        </div>

                        {addingDay === i && renderAddForm(i)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {unscheduledLogs.length > 0 && (
                <div className="rounded-lg bg-[var(--paper)] p-2">
                  <p className="mb-2 text-[11px] font-semibold text-[var(--ink-muted)]">Günü seçilmemiş hedefler</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {unscheduledLogs.map(renderLogCard)}
                  </div>
                </div>
              )}

              <div className="no-print flex justify-end border-t border-[var(--border)] pt-3">
                <button
                  onClick={finishProgram}
                  disabled={logs.length === 0}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50"
                >
                  Kaydet ve öğrenci sayfasına git
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
