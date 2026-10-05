'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft } from '@tabler/icons-react';
import { Suspense } from 'react';
import { NotesEditor } from '@/components/NotesEditor';

const HAFTALIK_TAKIP_KURUMU = 'Hüdayi Vakfı Çekmeköy YKS Yurdu';

function toLocalDatetime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function YeniGorusmeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const lockedStudentId = searchParams.get('ogrenci') ?? '';
  const [students, setStudents] = useState<{ id: string; full_name: string; kurum: string | null }[]>([]);
  const [meetingOwners, setMeetingOwners] = useState<{ id: string; full_name: string }[]>([]);
  const [lockedStudentName, setLockedStudentName] = useState<string | null>(null);
  const [lockedStudentKurum, setLockedStudentKurum] = useState<string | null>(null);
  const [selectedKurum, setSelectedKurum] = useState<string | null>(null);
  const [haftalikTakipGetirdi, setHaftalikTakipGetirdi] = useState<'evet' | 'hayir' | ''>('');
  const [studentId, setStudentId] = useState(lockedStudentId);
  const [meetingType, setMeetingType] = useState<'ogrenci' | 'veli'>('ogrenci');
  const [createdBy, setCreatedBy] = useState('');
  const [createdByOtherName, setCreatedByOtherName] = useState('');
  const [formOpenedAt] = useState(() => new Date());
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDatetime(formOpenedAt));
  const [duration, setDuration] = useState(1);
  const [durationEditedManually, setDurationEditedManually] = useState(false);
  const [topic, setTopic] = useState('');
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

// Form açıldığından beri geçen süreyi otomatik hesaplar (elle değiştirilirse durur)
useEffect(() => {
  if (durationEditedManually) return;
  const interval = setInterval(() => {
    const elapsedMs = Date.now() - formOpenedAt.getTime();
    setDuration(Math.max(1, Math.round(elapsedMs / 60000)));
  }, 1000);
  return () => clearInterval(interval);
}, [durationEditedManually, formOpenedAt]);
  
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCreatedBy(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentProfile } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: internLinks } = await (supabase as any)
        .from('teacher_access_profiles')
        .select('teacher_id')
        .eq('mentor_id', user.id)
        .in('status', ['intern', 'dorm_supervisor']);

      const internIds = (internLinks ?? []).map((row: { teacher_id: string }) => row.teacher_id);
      let internProfiles: { id: string; full_name: string }[] = [];
      if (internIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('profiles')
          .select('id, full_name')
          .in('id', internIds)
          .order('full_name');
        internProfiles = data ?? [];
      }

      setMeetingOwners([
        ...(currentProfile ? [currentProfile] : [{ id: user.id, full_name: 'Ben' }]),
        ...internProfiles,
      ]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: topicsData } = await (supabase as any)
        .from('meetings')
        .select('topic')
        .eq('coach_id', user.id)
        .not('topic', 'is', null);
      const uniqueTopics = Array.from(
        new Set((topicsData ?? []).map((t: { topic: string | null }) => t.topic).filter(Boolean))
      ) as string[];
      setTopicOptions(uniqueTopics);

      if (lockedStudentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('students').select('id, full_name, kurum').eq('id', lockedStudentId).eq('coach_id', user.id).single();
        if (data) {
          setLockedStudentName(data.full_name);
          setLockedStudentKurum(data.kurum ?? null);
          setSelectedKurum(data.kurum ?? null);
          setStudentId(data.id);
        }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('students').select('id, full_name, kurum').eq('coach_id', user.id).neq('status', 'pasif').order('full_name');
      setStudents(data ?? []);
      if (!studentId && data?.length) {
        setStudentId(data[0].id);
        setSelectedKurum(data[0].kurum ?? null);
      }
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

    const isTargetKurum = (lockedStudentId ? lockedStudentKurum : selectedKurum) === HAFTALIK_TAKIP_KURUMU;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('meetings').insert({
      student_id: studentId,
      coach_id: user.id,
      created_by: createdBy === 'other' ? null : (createdBy || user.id),
      created_by_other_name: createdBy === 'other' ? createdByOtherName.trim() || null : null,
      meeting_type: meetingType,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      topic: topic.trim() || null,
      notes: notes.trim() || null,
      haftalik_takip_getirdi: isTargetKurum && haftalikTakipGetirdi ? haftalikTakipGetirdi === 'evet' : null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/gorusmeler/${studentId}`);
    router.refresh();
  }

  const backHref = lockedStudentId ? `/gorusmeler/${lockedStudentId}` : '/gorusmeler';
  const showHaftalikTakip = (lockedStudentId ? lockedStudentKurum : selectedKurum) === HAFTALIK_TAKIP_KURUMU;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-center gap-3">
        <Link href={backHref} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="text-[18px] font-medium text-gray-900">Görüşme ekle</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Öğrenci</label>
            {lockedStudentId ? (
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
                {lockedStudentName ?? 'Yükleniyor...'}
              </div>
            ) : (
              <select
                required
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  const s = students.find((st) => st.id === e.target.value);
                  setSelectedKurum(s?.kurum ?? null);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Görüşmeyi yapan</label>
            <select
              value={createdBy}
              onChange={(e) => {
                setCreatedBy(e.target.value);
                if (e.target.value !== 'other') setCreatedByOtherName('');
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {meetingOwners.map((owner) => <option key={owner.id} value={owner.id}>{owner.full_name}</option>)}
              <option value="other">Diğer</option>
            </select>
          </div>

          {createdBy === 'other' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Görüşmeyi yapan kişi</label>
              <input
                type="text"
                value={createdByOtherName}
                onChange={(e) => setCreatedByOtherName(e.target.value)}
                placeholder="Ad soyad veya açıklama"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

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
              min={1}
              max={180}
              value={duration}
              onChange={(e) => { setDuration(Number(e.target.value)); setDurationEditedManually(true); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {!durationEditedManually && (
              <p className="mt-1 text-[11px] text-gray-400">Form açıldığından beri otomatik sayılıyor — istersen elle değiştirebilirsin.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Konu</label>
            <input
              type="text"
              list="konu-onerileri"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Haftalık takip, TYT değerlendirme..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <datalist id="konu-onerileri">
              {topicOptions.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
            <NotesEditor
              value={notes}
              onChange={setNotes}
              rows={4}
              placeholder="Görüşme notları..."
            />
          </div>

          {showHaftalikTakip && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Haftalık takip çizelgesini getirdi mi? <span className="font-normal text-gray-400">(opsiyonel)</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {(['evet', 'hayir'] as const).map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      value={v}
                      checked={haftalikTakipGetirdi === v}
                      onChange={() => setHaftalikTakipGetirdi(v)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{v === 'evet' ? 'Evet' : 'Hayır'}</span>
                  </label>
                ))}
                {haftalikTakipGetirdi && (
                  <button
                    type="button"
                    onClick={() => setHaftalikTakipGetirdi('')}
                    className="text-[12px] text-gray-400 underline hover:text-gray-600"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Link href={backHref} className="flex-1 rounded-lg border border-gray-300 py-2 text-center text-sm text-gray-600 hover:bg-gray-50">İptal</Link>
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
