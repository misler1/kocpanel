'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft } from '@tabler/icons-react';
import { Suspense } from 'react';

function YeniGorusmeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [studentId, setStudentId] = useState(searchParams.get('ogrenci') ?? '');
  const [meetingType, setMeetingType] = useState<'ogrenci' | 'veli'>('ogrenci');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('students').select('id, full_name').eq('coach_id', user.id).neq('status', 'pasif').order('full_name');
      setStudents(data ?? []);
      if (!studentId && data?.length) setStudentId(data[0].id);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/giris'); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('meetings').insert({
      student_id: studentId,
      coach_id: user.id,
      meeting_type: meetingType,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      topic: topic.trim() || null,
      notes: notes.trim() || null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/gorusmeler');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/gorusmeler" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="text-[18px] font-medium text-gray-900">Görüşme ekle</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Öğrenci <span className="text-red-500">*</span></label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Görüşme türü</label>
            <div className="flex gap-3">
              {(['ogrenci', 'veli'] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" value={t} checked={meetingType === t} onChange={() => setMeetingType(t)} className="accent-blue-600" />
                  <span className="text-sm text-gray-700">{t === 'ogrenci' ? 'Öğrenci' : 'Veli'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tarih & Saat <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Süre (dakika)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Konu</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Haftalık takip, TYT değerlendirme..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Görüşme notları..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Link href="/gorusmeler" className="flex-1 rounded-lg border border-gray-300 py-2 text-center text-sm text-gray-600 hover:bg-gray-50">İptal</Link>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Ekleniyor...' : 'Görüşme ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function YeniGorusmePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Yükleniyor...</div>}>
      <YeniGorusmeForm />
    </Suspense>
  );
}
