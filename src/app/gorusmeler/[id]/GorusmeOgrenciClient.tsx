'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconCalendar, IconEdit, IconTrash, IconX, IconMessages, IconUser } from '@tabler/icons-react';
import { PageHero } from '@/components/ui/PageHero';
import { NotesEditor } from '@/components/NotesEditor';
import {
  draftKey, readDraft, writeDraft, removeDraft, hasText, DURATION_RESUME_MS, type MeetingDraft,
} from '@/lib/meetingDraft';
import { SuggestInput } from '@/components/SuggestInput';
import { MeetingPhotos, MeetingPhotoStrip, appendReadText } from '@/components/meeting/MeetingPhotos';

const HAFTALIK_TAKIP_KURUMU = 'Hüdayi Vakfı Çekmeköy YKS Yurdu';
const MEETING_SELECT = '*, created_by_profile:created_by(id, full_name)';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]';
const labelCls = 'mb-1 block text-sm font-medium text-[var(--ink)]';

function toLocalDatetime(input: string | Date) {
  const d = new Date(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Öğrencinin görüşme kayıtları: üstte yeni görüşme formu, altında önceki görüşmeler.
 * variant="panel": öğrenci detayındaki yan panelde (başlık yok, tek sütun) kullanılır.
 */
export function GorusmeOgrenciClient({
  student, initialMeetings, variant = 'page', onCreated,
}: {
  student: { id: string; full_name: string; kurum?: string | null };
  initialMeetings: any[];
  variant?: 'page' | 'panel';
  onCreated?: () => void;
}) {
  const isPanel = variant === 'panel';
  const grid2 = isPanel ? 'grid gap-3' : 'grid gap-4 sm:grid-cols-2';
  const supabase = useMemo(() => createClient(), []);
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [meetingOwners, setMeetingOwners] = useState<{ id: string; full_name: string }[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);

  // ── Yeni görüşme formu state ──
  const [createdBy, setCreatedBy] = useState('');
  const [createdByOtherName, setCreatedByOtherName] = useState('');
  const [meetingType, setMeetingType] = useState<'ogrenci' | 'veli'>('ogrenci');
  const [formOpenedAt, setFormOpenedAt] = useState(() => new Date());
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDatetime(new Date()));
  const [duration, setDuration] = useState(1);
  const [durationEditedManually, setDurationEditedManually] = useState(false);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [haftalikTakipGetirdi, setHaftalikTakipGetirdi] = useState<'evet' | 'hayir' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showHaftalikTakip = student.kurum === HAFTALIK_TAKIP_KURUMU;

  // ── Taslak: yazılanlar tarayıcıya kaydedilir, sayfa kapansa da geri yüklenir ──
  const [draftStorageKey, setDraftStorageKey] = useState<string | null>(null);
  const [restoredDraftAt, setRestoredDraftAt] = useState<number | null>(null);
  const hasContent = hasText(notes) || topic.trim() !== '' || createdByOtherName.trim() !== '' || photos.length > 0;

  function applyDraft(d: MeetingDraft) {
    setMeetingType(d.meetingType);
    if (d.createdBy) setCreatedBy(d.createdBy);
    setCreatedByOtherName(d.createdByOtherName ?? '');
    if (d.scheduledAt) setScheduledAt(d.scheduledAt);
    setTopic(d.topic ?? '');
    setNotes(d.notes ?? '');
    setPhotos(d.photos ?? []);
    setHaftalikTakipGetirdi(d.haftalikTakipGetirdi ?? '');
    if (d.durationEditedManually || Date.now() - d.openedAt > DURATION_RESUME_MS) {
      setDuration(d.duration);
      setDurationEditedManually(true);
    } else {
      setFormOpenedAt(new Date(d.openedAt)); // süre sayacı ilk açılıştan devam eder
    }
    setRestoredDraftAt(d.savedAt);
  }

  useEffect(() => {
    if (!draftStorageKey) return;
    const t = setTimeout(() => {
      if (!hasContent) { removeDraft(draftStorageKey); return; }
      writeDraft(draftStorageKey, {
        v: 1, savedAt: Date.now(), openedAt: formOpenedAt.getTime(), studentId: student.id, meetingType, createdBy,
        createdByOtherName, scheduledAt, duration, durationEditedManually, topic, notes, haftalikTakipGetirdi, photos,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [draftStorageKey, hasContent, formOpenedAt, student.id, meetingType, createdBy, createdByOtherName, scheduledAt, duration, durationEditedManually, topic, notes, haftalikTakipGetirdi, photos]);

  // Sayfadan çıkılırken (başka sayfaya geçiş, panel kapanması, sekme kapanması) son yazılanlar da kaydedilir:
  // yukarıdaki 400 ms'lik gecikme beklenmez.
  const latestDraft = useRef<{ key: string | null; data: MeetingDraft | null }>({ key: null, data: null });
  useEffect(() => {
    latestDraft.current = {
      key: draftStorageKey,
      data: hasContent ? {
        v: 1, savedAt: Date.now(), openedAt: formOpenedAt.getTime(), studentId: student.id, meetingType, createdBy,
        createdByOtherName, scheduledAt, duration, durationEditedManually, topic, notes, haftalikTakipGetirdi, photos,
      } : null,
    };
  });
  useEffect(() => {
    const flush = () => {
      const { key, data } = latestDraft.current;
      if (key && data) writeDraft(key, { ...data, savedAt: Date.now() });
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);

  // Kaydedilmemiş not varken sekme/pencere kapatılırken tarayıcı uyarısı
  useEffect(() => {
    if (!hasContent) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasContent]);

  function resetForm() {
    const now = new Date();
    setTopic('');
    setNotes('');
    setPhotos([]);
    setCreatedByOtherName('');
    setHaftalikTakipGetirdi('');
    setMeetingType('ogrenci');
    setFormOpenedAt(now);
    setScheduledAt(toLocalDatetime(now));
    setDuration(1);
    setDurationEditedManually(false);
    setRestoredDraftAt(null);
  }

  function discardDraft() {
    if (!confirm('Kaydedilmemiş görüşme taslağı silinsin mi?')) return;
    if (draftStorageKey) removeDraft(draftStorageKey);
    resetForm();
  }

  // Form açıldığından beri geçen süreyi otomatik hesapla (elle değiştirilirse durur)
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

      // Bu öğrenci için kaydedilmemiş taslak varsa geri yükle
      // (Görüşme ekle sayfasında bu öğrenci seçilerek başlanmış taslak da buraya taşınır)
      const key = draftKey(user.id, student.id);
      let d = readDraft(key);
      const generalKey = draftKey(user.id, '');
      const g = d ? null : readDraft(generalKey);
      if (g && g.studentId === student.id) {
        d = g;
        writeDraft(key, g);
        removeDraft(generalKey);
      }
      // Taslak, diğer sorguları beklemeden hemen geri yüklenir ve kaydedilmeye başlar
      if (d) applyDraft(d);
      setDraftStorageKey(key);


      const { data: currentProfile } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single();

      const { data: internLinks } = await (supabase as any)
        .from('teacher_access_profiles')
        .select('teacher_id')
        .eq('mentor_id', user.id)
        .in('status', ['intern', 'dorm_supervisor']);

      const internIds = (internLinks ?? []).map((row: { teacher_id: string }) => row.teacher_id);
      let internProfiles: { id: string; full_name: string }[] = [];
      if (internIds.length > 0) {
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

      const { data: topicsData } = await (supabase as any)
        .from('meetings')
        .select('topic')
        .not('topic', 'is', null);
      const unique = Array.from(
        new Set((topicsData ?? []).map((t: any) => t.topic).filter(Boolean))
      ) as string[];
      setTopicOptions(unique);

    }
    load();
  }, [supabase, student.id]);

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [meetings]
  );
  const latest = sortedMeetings[0] ?? null;
  const previous = sortedMeetings.slice(1);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Oturum bulunamadı, lütfen tekrar giriş yapın.'); setLoading(false); return; }

    const { data, error: err } = await (supabase as any)
      .from('meetings')
      .insert({
        student_id: student.id,
        coach_id: user.id,
        created_by: createdBy === 'other' ? null : (createdBy || user.id),
        created_by_other_name: createdBy === 'other' ? createdByOtherName.trim() || null : null,
        meeting_type: meetingType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        topic: topic.trim() || null,
        notes: notes.trim() || null,
        haftalik_takip_getirdi: showHaftalikTakip && haftalikTakipGetirdi ? haftalikTakipGetirdi === 'evet' : null,
        ...(photos.length ? { photos } : {}), // sütun meeting_photos.sql ile gelir; fotoğraf yoksa gönderilmez
      })
      .select(MEETING_SELECT)
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    setMeetings((prev) => [data, ...prev]);
    if (data.topic && !topicOptions.includes(data.topic)) setTopicOptions((p) => [...p, data.topic]);

    // Taslağı sil, formu sıfırla
    if (draftStorageKey) removeDraft(draftStorageKey);
    resetForm();
    setLoading(false);
    onCreated?.();
  }

  return (
    <div className={isPanel ? '' : 'mx-auto max-w-3xl'}>
      {!isPanel && (
        <PageHero
          theme="teal"
          backHref="/gorusmeler"
          icon={<IconMessages size={22} />}
          title={student.full_name}
          subtitle="Görüşme kayıtları"
          chips={[`${meetings.length} görüşme`, latest ? `Son: ${new Date(latest.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` : null]}
          actions={
            <Link href={`/ogrenciler/${student.id}`} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700">
              <IconUser size={15} /> Öğrenci detayı
            </Link>
          }
        />
      )}

      {/* ── Yeni görüşme formu (her zaman açık) ── */}
      <section className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm ${isPanel ? 'mb-4' : 'mb-6'}`}>
        <div className="flex items-center gap-2 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-white px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white"><IconMessages size={16} /></span>
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Yeni görüşme</h2>
        </div>
        <div className={isPanel ? 'px-4 py-4' : 'px-5 py-5'}>
        {restoredDraftAt && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
            <span>
              Kaydedilmemiş görüşme taslağın geri yüklendi
              {' '}({new Date(restoredDraftAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}).
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={discardDraft} className="font-medium text-amber-800 underline hover:text-amber-950">
                Taslağı sil
              </button>
              <button type="button" onClick={() => setRestoredDraftAt(null)} aria-label="Bildirimi kapat" title="Bildirimi kapat (taslak silinmez)"
                className="rounded p-0.5 text-amber-700 hover:bg-amber-100 hover:text-amber-950">
                <IconX size={16} />
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className={grid2}>
            <div>
              <label className={labelCls}>Görüşmeyi yapan</label>
              <select
                value={createdBy}
                onChange={(e) => {
                  setCreatedBy(e.target.value);
                  if (e.target.value !== 'other') setCreatedByOtherName('');
                }}
                className={inputCls}
              >
                {meetingOwners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                <option value="other">Diğer</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Görüşme türü</label>
              <div className="flex gap-4 py-2">
                {(['ogrenci', 'veli'] as const).map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" value={t} checked={meetingType === t}
                      onChange={() => setMeetingType(t)} className="accent-[var(--accent)]" />
                    <span className="text-sm text-[var(--ink)]">{t === 'ogrenci' ? 'Öğrenci' : 'Veli'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {createdBy === 'other' && (
            <div>
              <label className={labelCls}>Görüşmeyi yapan kişi</label>
              <input type="text" value={createdByOtherName}
                onChange={(e) => setCreatedByOtherName(e.target.value)}
                placeholder="Ad soyad veya açıklama" className={inputCls} />
            </div>
          )}

          <div className={grid2}>
            <div>
              <label className={labelCls}>Tarih & Saat</label>
              <input type="datetime-local" required value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Süre (dakika)</label>
              <input type="number" min={1} max={180} value={duration}
                onChange={(e) => { setDuration(Number(e.target.value)); setDurationEditedManually(true); }}
                className={inputCls} />
              {!durationEditedManually && (
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Sayfa açıldığından beri otomatik sayılıyor — elle değiştirebilirsin.</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Konu</label>
            <SuggestInput options={topicOptions} value={topic}
              onChange={setTopic}
              placeholder="Haftalık takip, TYT değerlendirme..." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Notlar</label>
            <NotesEditor value={notes} onChange={setNotes} rows={4} placeholder="Görüşme notları..." />
            <div className="mt-2">
              <MeetingPhotos studentId={student.id} photos={photos} onChange={setPhotos}
                onReadText={(t) => setNotes((n) => appendReadText(n, t))} />
            </div>
            {draftStorageKey && hasContent && (
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Taslak otomatik kaydediliyor; sayfa kapansa da notların kaybolmaz.</p>
            )}
          </div>

          {showHaftalikTakip && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-3">
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Haftalık takip çizelgesini getirdi mi? <span className="font-normal text-[var(--ink-muted)]">(opsiyonel)</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {(['evet', 'hayir'] as const).map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" value={v} checked={haftalikTakipGetirdi === v}
                      onChange={() => setHaftalikTakipGetirdi(v)} className="accent-[var(--accent)]" />
                    <span className="text-sm text-[var(--ink)]">{v === 'evet' ? 'Evet' : 'Hayır'}</span>
                  </label>
                ))}
                {haftalikTakipGetirdi && (
                  <button type="button" onClick={() => setHaftalikTakipGetirdi('')}
                    className="text-[12px] text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                    Temizle
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
            {loading ? 'Ekleniyor...' : 'Görüşmeyi kaydet'}
          </button>
        </form>
        </div>
      </section>

      {/* ── Görüşme listesi ── */}
      {meetings.length === 0 ? (
        <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] ${isPanel ? 'py-8' : 'py-16'}`}>
          <IconCalendar size={32} className="text-[var(--ink-muted)]" />
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz görüşme eklenmemiş.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {latest && (
            <section>
              <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Son görüşme</h2>
              <MeetingCard
                key={latest.id}
                meeting={latest}
                student={student}
                topicOptions={topicOptions}
                onSaved={(u) => setMeetings((prev) => prev.map((m) => (m.id === u.id ? u : m)))}
                onDeleted={(id) => setMeetings((prev) => prev.filter((m) => m.id !== id))}
              />
            </section>
          )}

          {previous.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Önceki görüşmeler</h2>
              <div className="flex flex-col gap-3">
                {previous.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    student={student}
                    topicOptions={topicOptions}
                    onSaved={(u) => setMeetings((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
                    onDeleted={(id) => setMeetings((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting, student, topicOptions, onSaved, onDeleted,
}: {
  meeting: any;
  student: { id: string; full_name: string; kurum?: string | null };
  topicOptions: string[];
  onSaved: (m: any) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const dt = new Date(meeting.scheduled_at);
  const dateStr = dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const isVeli = meeting.meeting_type === 'veli';
  const doneBy = meeting.created_by_profile?.full_name ?? meeting.created_by_other_name;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { data } = await (supabase.from('meetings') as any)
      .update({
        scheduled_at: new Date(editing.scheduled_at_local).toISOString(),
        meeting_type: editing.meeting_type,
        topic: editing.topic?.trim() || null,
        notes: editing.notes?.trim() || null,
        duration_minutes: Number(editing.duration_minutes),
        haftalik_takip_getirdi: editing.haftalik_takip_getirdi ?? null,
        ...((editing.photos?.length || meeting.photos?.length) ? { photos: editing.photos ?? [] } : {}),
      })
      .eq('id', meeting.id)
      .select(MEETING_SELECT)
      .single();
    if (data) onSaved(data);
    setSaving(false);
    setEditing(null);
  }

  async function handleDelete() {
    await (supabase.from('meetings') as any).delete().eq('id', meeting.id);
    onDeleted(meeting.id);
  }

  // ── Düzenleme modu (kart içinde) ──
  if (editing) {
    return (
      <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--card)] p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-[var(--ink)]">Görüşmeyi düzenle</h3>
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className={labelCls}>Görüşme türü</label>
            <div className="flex gap-4">
              {[{ value: 'ogrenci', label: 'Öğrenci' }, { value: 'veli', label: 'Veli' }].map((t) => (
                <label key={t.value} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" value={t.value} checked={editing.meeting_type === t.value}
                    onChange={() => setEditing({ ...editing, meeting_type: t.value })}
                    className="accent-[var(--accent)]" />
                  <span className="text-sm text-[var(--ink)]">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Tarih & Saat</label>
              <input type="datetime-local" value={editing.scheduled_at_local}
                onChange={(e) => setEditing({ ...editing, scheduled_at_local: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Süre (dakika)</label>
              <input type="number" min={1} max={180} value={editing.duration_minutes}
                onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Konu</label>
            <SuggestInput options={topicOptions} value={editing.topic ?? ''}
              onChange={(v) => setEditing({ ...editing, topic: v })}
              placeholder="Haftalık takip, TYT değerlendirme..." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Notlar</label>
            <NotesEditor
              value={editing.notes ?? ''}
              onChange={(v) => setEditing({ ...editing, notes: v })}
              rows={4}
              placeholder="Görüşme notları..."
            />
            <div className="mt-2">
              <MeetingPhotos studentId={student.id} photos={editing.photos ?? []} deleteOnRemove={false}
                onChange={(p) => setEditing((e: any) => ({ ...e, photos: p }))}
                onReadText={(t) => setEditing((e: any) => ({ ...e, notes: appendReadText(e.notes ?? '', t) }))} />
            </div>
          </div>

          {student.kurum === HAFTALIK_TAKIP_KURUMU && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-3">
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Haftalık takip çizelgesini getirdi mi? <span className="font-normal text-[var(--ink-muted)]">(opsiyonel)</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={editing.haftalik_takip_getirdi === true}
                    onChange={() => setEditing({ ...editing, haftalik_takip_getirdi: true })}
                    className="accent-[var(--accent)]" />
                  <span className="text-sm text-[var(--ink)]">Evet</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={editing.haftalik_takip_getirdi === false}
                    onChange={() => setEditing({ ...editing, haftalik_takip_getirdi: false })}
                    className="accent-[var(--accent)]" />
                  <span className="text-sm text-[var(--ink)]">Hayır</span>
                </label>
                {editing.haftalik_takip_getirdi !== null && editing.haftalik_takip_getirdi !== undefined && (
                  <button type="button" onClick={() => setEditing({ ...editing, haftalik_takip_getirdi: null })}
                    className="text-[12px] text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                    Temizle
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setEditing(null)}
              className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]">
              İptal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Görüntüleme modu: tüm detaylar açık ──
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">{dateStr}</h3>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{timeStr} · {meeting.duration_minutes} dk</p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isVeli ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'}`}>
          {isVeli ? 'Veli görüşmesi' : 'Öğrenci görüşmesi'}
        </span>
      </div>

      {doneBy && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Görüşmeyi yapan</p>
          <p className="text-[14px] text-[var(--ink)]">{doneBy}</p>
        </div>
      )}

      {meeting.topic && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Konu</p>
          <p className="text-[14px] text-[var(--ink)]">{meeting.topic}</p>
        </div>
      )}

      {meeting.notes && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Notlar</p>
          <p className="whitespace-pre-wrap rounded-lg bg-[var(--paper)] p-3 text-[13px] text-[var(--ink)]">{meeting.notes}</p>
        </div>
      )}

      {meeting.photos?.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Defter fotoğrafları</p>
          <MeetingPhotoStrip photos={meeting.photos} />
        </div>
      )}

      {meeting.haftalik_takip_getirdi !== null && meeting.haftalik_takip_getirdi !== undefined && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Haftalık takip çizelgesi</p>
          <p className={`text-[13px] font-medium ${meeting.haftalik_takip_getirdi ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {meeting.haftalik_takip_getirdi ? 'Getirdi ✓' : 'Getirmedi ✗'}
          </p>
        </div>
      )}

      {!meeting.topic && !meeting.notes && !meeting.photos?.length && (
        <p className="mb-3 text-[13px] text-[var(--ink-muted)]">Bu görüşme için konu veya not girilmemiş.</p>
      )}

      {confirmDelete ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5">
          <span className="flex-1 text-[13px] text-[var(--danger)]">Bu görüşme kalıcı olarak silinecek. Emin misin?</span>
          <button onClick={() => setConfirmDelete(false)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink-muted)] hover:bg-[var(--paper)]">
            Vazgeç
          </button>
          <button onClick={handleDelete}
            className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90">
            Evet, sil
          </button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setEditing({ ...meeting, scheduled_at_local: toLocalDatetime(meeting.scheduled_at) })}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
            <IconEdit size={14} /> Düzenle
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 px-3 py-1.5 text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]">
            <IconTrash size={14} /> Sil
          </button>
        </div>
      )}
    </div>
  );
}