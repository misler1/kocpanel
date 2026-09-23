'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconArrowLeft, IconPlus, IconCalendar, IconEdit, IconTrash } from '@tabler/icons-react';

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GorusmeOgrenciClient({
  student, initialMeetings,
}: { student: { id: string; full_name: string }; initialMeetings: any[] }) {
  const supabase = createClient();
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
    const [topicOptions, setTopicOptions] = useState<string[]>([]);

  useEffect(() => {
    async function loadTopics() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('meetings')
        .select('topic')
        .eq('coach_id', user.id)
        .not('topic', 'is', null);
      const unique = Array.from(
        new Set((data ?? []).map((t: any) => t.topic).filter(Boolean))
      ) as string[];
      setTopicOptions(unique);
    }
    loadTopics();
  }, []);

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now);
  const past = meetings.filter((m) => new Date(m.scheduled_at) < now);

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
        completed: editing.completed,
      })
      .eq('id', editing.id)
      .select('*')
      .single();

    if (data) setMeetings((prev) => prev.map((m) => m.id === editing.id ? data : m));
    setSaving(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    await (supabase.from('meetings') as any).delete().eq('id', id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
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
        <Link
          href={`/gorusmeler/yeni?ogrenci=${student.id}`}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <IconCalendar size={32} className="text-[var(--ink-muted)]" />
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz görüşme eklenmemiş.</p>
          <Link href={`/gorusmeler/yeni?ogrenci=${student.id}`} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
            İlk görüşmeyi ekle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium text-[var(--ink-muted)]">Yaklaşan</h2>
              <MeetingGroup
                meetings={upcoming}
                onEdit={(m) => setEditing({ ...m, scheduled_at_local: toLocalDatetime(m.scheduled_at) })}
                onDelete={(id) => setDeletingId(id)}
              />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium text-[var(--ink-muted)]">Geçmiş</h2>
              <MeetingGroup
                meetings={past}
                onEdit={(m) => setEditing({ ...m, scheduled_at_local: toLocalDatetime(m.scheduled_at) })}
                onDelete={(id) => setDeletingId(id)}
              />
            </section>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-[var(--ink)]">Görüşmeyi düzenle</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Görüşme türü</label>
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

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Tarih & Saat</label>
                <input type="datetime-local" value={editing.scheduled_at_local}
                  onChange={(e) => setEditing({ ...editing, scheduled_at_local: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Süre (dakika)</label>
                <input type="number" min={5} max={180} value={editing.duration_minutes}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Konu</label>
                <input type="text"
                  list="konu-onerileri-duzenle"
                  value={editing.topic ?? ''}
                  onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  placeholder="Haftalık takip, TYT değerlendirme..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
                <datalist id="konu-onerileri-duzenle">
                  {topicOptions.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Notlar</label>
                <textarea rows={3} value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Görüşme notları..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={editing.completed}
                  onChange={(e) => setEditing({ ...editing, completed: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]" />
                <span className="text-sm text-[var(--ink)]">Tamamlandı olarak işaretle</span>
              </label>

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
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-[var(--ink)]">Görüşmeyi sil?</h3>
            <p className="mb-5 text-sm text-[var(--ink-muted)]">Bu görüşme kalıcı olarak silinecek. Geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                Vazgeç
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-[var(--danger)] py-2 text-sm font-semibold text-white hover:opacity-90">
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingGroup({
  meetings, onEdit, onDelete,
}: { meetings: any[]; onEdit: (m: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {meetings.map((m: any) => {
        const dt = new Date(m.scheduled_at);
        const monthShort = dt.toLocaleDateString('tr-TR', { month: 'short' });
        const dayNum = dt.getDate();
        const weekdayStr = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
        const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const isVeli = m.meeting_type === 'veli';

        return (
          <div key={m.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--paper)] py-1.5 leading-none">
              <span className="text-[10px] font-medium text-[var(--ink-muted)]">{monthShort}</span>
              <span className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{dayNum}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isVeli ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'
                  }`}
                >
                  {isVeli ? 'Veli' : 'Koç'}
                </span>
                <span className="text-[12px] text-[var(--ink-muted)]">{weekdayStr} · {timeStr} · {m.duration_minutes} dk</span>
              </div>
              {m.topic && <div className="mt-0.5 truncate text-[13px] text-[var(--ink)]">{m.topic}</div>}
              {m.haftalik_takip_getirdi !== null && m.haftalik_takip_getirdi !== undefined && (
                <div className={`mt-0.5 text-[11px] font-medium ${m.haftalik_takip_getirdi ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  Haftalık takip: {m.haftalik_takip_getirdi ? 'Getirdi ✓' : 'Getirmedi ✗'}
                </div>
              )}
            </div>

            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                m.completed ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
              }`}
            >
              {m.completed ? 'Tamamlandı' : 'Bekliyor'}
            </span>

            <div className="flex flex-shrink-0 gap-1">
              <button onClick={() => onEdit(m)} title="Düzenle"
                className="rounded p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-dark)]">
                <IconEdit size={15} />
              </button>
              <button onClick={() => onDelete(m.id)} title="Sil"
                className="rounded p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">
                <IconTrash size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}