/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconTrash } from '@tabler/icons-react';

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  return start.toISOString().slice(0, 10);
}

export default function SoruTakibiPage() {
  const supabase = createClient();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Öğrencinin kaydındaki ders→kaynaklar haritası
  const [resourceMap, setResourceMap] = useState<Record<string, string[]>>({});

  // Yeni satır ekleme için seçili ders ve kaynak
  const [newSubject, setNewSubject] = useState('');
  const [newResource, setNewResource] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const weekStart = getWeekStart();

  /* Öğrenci listesini çek */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('students')
        .select('id, full_name, resources')
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

  /* Öğrenci seçilince kaynak haritasını ve logları yükle */
  useEffect(() => {
    if (!selectedStudentId) return;

    const st = students.find((s) => s.id === selectedStudentId) ?? null;
    setSelectedStudent(st);

    // resources alanı: { "TYT Matematik": ["Antrenman", "Karekök", ""] }
    const rm: Record<string, string[]> = {};
    if (st?.resources) {
      for (const [subject, sources] of Object.entries(st.resources as Record<string, string[]>)) {
        const filtered = sources.filter((s) => s.trim() !== '');
        if (filtered.length > 0) rm[subject] = filtered;
      }
    }
    setResourceMap(rm);

    // İlk dersi otomatik seç
    const firstSubject = Object.keys(rm)[0] ?? '';
    setNewSubject(firstSubject);
    setNewResource(rm[firstSubject]?.[0] ?? '');
    setNewTarget('');

    loadLogs(selectedStudentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, students]);

  /* Ders seçimi değişince kaynağı sıfırla */
  useEffect(() => {
    setNewResource(resourceMap[newSubject]?.[0] ?? '');
  }, [newSubject, resourceMap]);

  async function loadLogs(studentId: string) {
    const { data } = await (supabase as any)
      .from('question_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start', weekStart);
    setLogs(data ?? []);
  }

  async function addLog() {
    if (!newTarget || !selectedStudentId || !newSubject) return;

    const { data } = await (supabase as any)
      .from('question_logs')
      .insert({
        student_id: selectedStudentId,
        subject: newSubject,
        resource_name: newResource || null,
        week_start: weekStart,
        target_count: Number(newTarget),
        done_count: 0,
      })
      .select()
      .single();

    if (data) {
      setLogs((prev) => [...prev, data]);
      setNewTarget('');
    }
  }

  async function updateDone(id: string, value: number) {
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, done_count: value } : l));
    await (supabase as any).from('question_logs').update({ done_count: value }).eq('id', id);
  }

  async function deleteLog(id: string) {
    await (supabase as any).from('question_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const weekLabel = new Date(weekStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const subjects = Object.keys(resourceMap);

  if (loading) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-[18px] font-medium text-gray-900">Soru takibi</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Hafta başı: {weekLabel}</p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-gray-400">Henüz öğrenci eklenmemiş.</p>
      ) : (
        <>
          {/* Öğrenci seçimi */}
          <div className="mb-4 flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${selectedStudentId === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s.full_name}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">

            {/* Kaynak yoksa uyarı */}
            {subjects.length === 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800">
                Bu öğrenciye ait kayıtlı kaynak bulunamadı. Öğrenci düzenleme sayfasından &quot;Kullanılan Kaynaklar&quot; bölümünü doldur.
              </div>
            )}

            {/* Yeni satır ekleme */}
            {subjects.length > 0 && (
              <div className="mb-4 flex flex-wrap items-end gap-2">
                {/* Ders seçimi */}
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1 block text-[12px] font-medium text-gray-500">Ders</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Kaynak seçimi */}
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1 block text-[12px] font-medium text-gray-500">Kaynak</label>
                  <select
                    value={newResource}
                    onChange={(e) => setNewResource(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {(resourceMap[newSubject] ?? []).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Hedef */}
                <div className="w-24">
                  <label className="mb-1 block text-[12px] font-medium text-gray-500">Hedef</label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="50"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={addLog}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
            )}

            {/* Log listesi */}
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Bu hafta için kayıt eklenmemiş.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const pct = log.target_count > 0
                    ? Math.min((log.done_count / log.target_count) * 100, 100)
                    : 0;
                  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <div key={log.id} className="py-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div>
                          <span className="text-[13px] font-medium text-gray-900">{log.subject}</span>
                          {log.resource_name && (
                            <span className="ml-2 text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                              {log.resource_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-500">{log.done_count} / {log.target_count}</span>
                          <button onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-500">
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="mb-1.5 h-1.5 rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={log.target_count || 100}
                        value={log.done_count}
                        onChange={(e) => updateDone(log.id, Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
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