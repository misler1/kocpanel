/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconTrash, IconPlus, IconChevronDown, IconDownload } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Verilen başlangıç günü (0=Pzt) için en son geçmiş o günün tarihini döndürür
function getWeekStartDate(weekStartDay: number): Date {
  const now = new Date();
  const todayDay = (now.getDay() + 6) % 7; // 0=Pzt
  let diff = todayDay - weekStartDay;
  if (diff < 0) diff += 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekEndDate(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// İlerleme çubuğu: sabit alan içinde normal + ekstra
function ProgressBar({ done, target }: { done: number; target: number }) {
  if (target === 0) return null;
  const normalPct = Math.min((done / target) * 100, 100);
  const extraPct = done > target ? Math.min(((done - target) / target) * 100, 100) : 0;
  const color = normalPct >= 80 ? 'bg-emerald-500' : normalPct >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      {/* Normal ilerleme */}
      <div
        className={`absolute left-0 top-0 h-full rounded-full ${color} transition-all`}
        style={{ width: `${normalPct}%` }}
      />
      {/* Ekstra ilerleme (farklı renk, normalin üstüne) */}
      {extraPct > 0 && (
        <div
          className="absolute top-0 h-full rounded-full bg-purple-400 opacity-70 transition-all"
          style={{ left: `${normalPct - extraPct * (normalPct / 100)}%`, width: `${extraPct}%` }}
        />
      )}
    </div>
  );
}

export default function HaftalikTakipPage() {
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceMap, setResourceMap] = useState<Record<string, string[]>>({});
  const filteredStudents = students.filter((s) => matchesFilter(s));

  // Yeni hedef formu
  const [newSubject, setNewSubject] = useState('');
  const [newResource, setNewResource] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newTopicTarget, setNewTopicTarget] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Hafta bilgisi
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  // Öğrenci listesi
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('students')
        .select('id, full_name, resources, week_start_day, track, kurum, donem')
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

  // Öğrenci seçilince
  useEffect(() => {
    if (!selectedStudentId) return;
    const st = students.find((s) => s.id === selectedStudentId) ?? null;
    setSelectedStudent(st);

    // Hafta hesapla
    const startDay = st?.week_start_day ?? 0;
    const ws = getWeekStartDate(startDay);
    const we = getWeekEndDate(ws);
    setWeekStart(toDateStr(ws));
    setWeekEnd(toDateStr(we));

    // Kaynak haritası
    const rm: Record<string, string[]> = {};
    if (st?.resources) {
      for (const [subject, sources] of Object.entries(st.resources as Record<string, string[]>)) {
        const filtered = (sources as string[]).filter((s) => s.trim() !== '');
        if (filtered.length > 0) rm[subject] = filtered;
      }
    }
    setResourceMap(rm);
    const firstSubject = Object.keys(rm)[0] ?? '';
    setNewSubject(firstSubject);
    setNewResource(rm[firstSubject]?.[0] ?? '');
    setNewTopic('');
    setNewTarget('');
    setNewTopicTarget('');
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
  
  // Hafta değişince logları çek
  useEffect(() => {
    if (!selectedStudentId || !weekStart) return;
    loadLogs(selectedStudentId, weekStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, weekStart]);

  useEffect(() => {
    setNewResource(resourceMap[newSubject]?.[0] ?? '');
  }, [newSubject, resourceMap]);

  async function loadLogs(studentId: string, ws: string) {
    const { data } = await (supabase as any)
      .from('question_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start', ws);
    setLogs(data ?? []);
  }

  // daily_logs'tan bu haftaki done_count'ları otomatik hesapla
  async function syncFromDailyLogs() {
    if (!selectedStudentId || !weekStart || !weekEnd) return;
    const { data: dailyLogs } = await (supabase as any)
      .from('daily_logs')
      .select('question_solved, topic_studies, log_date')
      .eq('student_id', selectedStudentId)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd);

    if (!dailyLogs) return;

    // Konu → toplam soru sayısı
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

    // Her log için done_count güncelle
    for (const log of logs) {
      let newDone = 0;
      let newTopicDone = 0;

      if (log.topic) {
        // Konu bazlı hedef: o konuya ait soru sayısını bul
        const topicKey = `${log.subject}__${log.topic}`;
        newDone = topicTotals[topicKey] ?? 0;
        newTopicDone = topicMinutes[topicKey] ?? 0;
      } else {
        // Ders bazlı hedef: o derse ait tüm soruları say
        // Ders adını eşleştir (Groq'tan gelen ders adlarıyla)
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

  async function addLog() {
    if (!newTarget || !selectedStudentId || !newSubject) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await (supabase as any)
      .from('question_logs')
      .insert({
        student_id: selectedStudentId,
        coach_id: user?.id,
        subject: newSubject,
        resource_name: newResource || null,
        topic: newTopic || null,
        week_start: weekStart,
        week_end: weekEnd,
        target_count: Number(newTarget),
        done_count: 0,
        topic_target_minutes: newTopicTarget ? Number(newTopicTarget) : null,
        topic_done_minutes: 0,
      })
      .select()
      .single();

    if (data) {
      setLogs((prev) => [...prev, data]);
      setNewTarget('');
      setNewTopic('');
      setNewTopicTarget('');
      setShowForm(false);
    }
  }

  async function deleteLog(id: string) {
    await (supabase as any).from('question_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
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

  // Haftalık rapor metni
  function generateReport() {
    const lines: string[] = [];
    lines.push(`📊 Haftalık Rapor — ${selectedStudent?.full_name}`);
    lines.push(`📅 ${new Date(weekStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${new Date(weekEnd).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`);
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

  const weekLabel = weekStart
    ? `${new Date(weekStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${new Date(weekEnd).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`
    : '';

  const subjects = Object.keys(resourceMap);

  if (loading) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Haftalık Program Takibi</h1>
          {weekLabel && <p className="mt-0.5 text-[13px] text-gray-500">{weekLabel}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncFromDailyLogs}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
          >
            🔄 WhatsApp'tan güncelle
          </button>
          {logs.length > 0 && (
            <button
              onClick={generateReport}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              <IconDownload size={13} /> Rapor al
            </button>
          )}
        </div>
      </div>

        {filteredStudents.length === 0 ? (
        <p className="text-sm text-gray-400">Henüz öğrenci eklenmemiş.</p>
      ) : (
        <>
          {/* Öğrenci seçimi */}
          <div className="mb-4 flex flex-wrap gap-2">
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${selectedStudentId === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s.full_name}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 space-y-4">

            {/* Hafta başlangıç günü ayarı */}
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-gray-500 flex-shrink-0">Hafta başlangıcı:</span>
              <div className="flex flex-wrap gap-1">
                {DAYS_TR.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => updateWeekStartDay(i)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${(selectedStudent?.week_start_day ?? 0) === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Hedef ekleme formu */}
            <div>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline"
              >
                <IconPlus size={13} />
                Hedef ekle
                <IconChevronDown size={12} className={`transition-transform ${showForm ? 'rotate-180' : ''}`} />
              </button>

              {showForm && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-3">
                  {subjects.length === 0 && (
                    <p className="text-[12px] text-amber-700">Önce öğrenciye kaynak ekle.</p>
                  )}
                  {subjects.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {/* Ders */}
                        <div className="flex-1 min-w-[130px]">
                          <label className="mb-1 block text-[11px] font-medium text-gray-500">Ders</label>
                          <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500">
                            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {/* Kaynak */}
                        <div className="flex-1 min-w-[130px]">
                          <label className="mb-1 block text-[11px] font-medium text-gray-500">Kaynak</label>
                          <select value={newResource} onChange={(e) => setNewResource(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500">
                            {(resourceMap[newSubject] ?? []).map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Konu (opsiyonel) */}
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500">Konu <span className="text-gray-400">(opsiyonel)</span></label>
                        <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="örn. Üslü Sayılar"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Soru hedefi */}
                        <div className="flex-1 min-w-[100px]">
                          <label className="mb-1 block text-[11px] font-medium text-gray-500">Haftalık soru hedefi</label>
                          <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
                            placeholder="140"
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500" />
                        </div>
                        {/* Konu çalışma süresi (opsiyonel) */}
                        {newTopic && (
                          <div className="flex-1 min-w-[100px]">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500">Çalışma süresi hedefi (dk)</label>
                            <input type="number" value={newTopicTarget} onChange={(e) => setNewTopicTarget(e.target.value)}
                              placeholder="120"
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:outline-none focus:border-blue-500" />
                          </div>
                        )}
                      </div>
                      <button onClick={addLog}
                        className="w-full rounded-lg bg-blue-600 py-2 text-[13px] font-medium text-white hover:bg-blue-700">
                        Ekle
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Log listesi */}
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Bu hafta için henüz hedef eklenmemiş.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const pct = log.target_count > 0 ? Math.round((log.done_count / log.target_count) * 100) : 0;
                  const isOver = log.done_count > log.target_count;
                  const topicPct = log.topic_target_minutes > 0
                    ? Math.round((log.topic_done_minutes / log.topic_target_minutes) * 100)
                    : null;

                  return (
                    <div key={log.id} className="py-3">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <span className="text-[13px] font-medium text-gray-900">{log.subject}</span>
                          {log.topic && (
                            <span className="ml-2 text-[11px] text-gray-500">· {log.topic}</span>
                          )}
                          {log.resource_name && (
                            <span className="ml-2 text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                              {log.resource_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[12px] font-medium ${isOver ? 'text-purple-600' : pct >= 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {log.done_count}/{log.target_count}
                            {isOver && <span className="ml-1 text-[10px]">+{log.done_count - log.target_count}</span>}
                          </span>
                          <span className="text-[11px] text-gray-400">%{pct}</span>
                          <button onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-500">
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Soru ilerleme çubuğu */}
                      <ProgressBar done={log.done_count} target={log.target_count} />

                      {/* Konu çalışma süresi */}
                      {log.topic_target_minutes > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-[11px] text-gray-400">
                            <span>Konu çalışma</span>
                            <span>{log.topic_done_minutes ?? 0}/{log.topic_target_minutes} dk {topicPct !== null ? `(%${topicPct})` : ''}</span>
                          </div>
                          <ProgressBar done={log.topic_done_minutes ?? 0} target={log.topic_target_minutes} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}