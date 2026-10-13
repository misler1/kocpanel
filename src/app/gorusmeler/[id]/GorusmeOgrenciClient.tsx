'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft, IconCalendar, IconEdit, IconTrash } from '@tabler/icons-react';
import { NotesEditor } from '@/components/NotesEditor';

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

export function GorusmeOgrenciClient({
  student, initialMeetings,
}: { student: { id: string; full_name: string; kurum?: string | null }; initialMeetings: any[] }) {
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
  const [haftalikTakipGetirdi, setHaftalikTakipGetirdi] = useState<'evet' | 'hayir' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showHaftalikTakip = student.kurum === HAFTALIK_TAKIP_KURUMU;

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
  }, [supabase]);

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
      })
      .select(MEETING_SELECT)
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    setMeetings((prev) => [data, ...prev]);
    if (data.topic && !topicOptions.includes(data.topic)) setTopicOptions((p) => [...p, data.topic]);

    // Formu sıfırla
    const now = new Date();
    setTopic('');
    setNotes('');
    setHaftalikTakipGetirdi('');
    setMeetingType('ogrenci');
    setFormOpenedAt(now);
    setScheduledAt(toLocalDatetime(now));
    setDuration(1);
    setDurationEditedManually(false);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/gorusmeler" className="rounded-lg p-2 text-[var(--ink-muted)] hover:bg-[var(--paper)]">
          <IconArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">{student.full_name}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{meetings.length} görüşme</p>
        </div>
      </div>

      {/* ── Yeni görüşme formu (her zaman açık) ── */}
      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-5">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--ink)]">Yeni görüşme</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
            <input type="text" list="konu-onerileri-yeni" value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Haftalık takip, TYT değerlendirme..." className={inputCls} />
            <datalist id="konu-onerileri-yeni">
              {topicOptions.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className={labelCls}>Notlar</label>
            <NotesEditor value={notes} onChange={setNotes} rows={4} placeholder="Görüşme notları..." />
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
      </section>

      {/* ── Görüşme listesi ── */}
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16">
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
            <input type="text" list={`konu-onerileri-${meeting.id}`} value={editing.topic ?? ''}
              onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
              placeholder="Haftalık takip, TYT değerlendirme..." className={inputCls} />
            <datalist id={`konu-onerileri-${meeting.id}`}>
              {topicOptions.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className={labelCls}>Notlar</label>
            <NotesEditor
              value={editing.notes ?? ''}
              onChange={(v) => setEditing({ ...editing, notes: v })}
              rows={4}
              placeholder="Görüşme notları..."
            />
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

      {meeting.haftalik_takip_getirdi !== null && meeting.haftalik_takip_getirdi !== undefined && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Haftalık takip çizelgesi</p>
          <p className={`text-[13px] font-medium ${meeting.haftalik_takip_getirdi ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {meeting.haftalik_takip_getirdi ? 'Getirdi ✓' : 'Getirmedi ✗'}
          </p>
        </div>
      )}

      {!meeting.topic && !meeting.notes && (
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