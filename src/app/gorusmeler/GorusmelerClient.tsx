'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconCalendar, IconEdit, IconTrash } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';

// ─── Tipler ──────────────────────────────────────────────────

interface Props {
  initialMeetings: any[];
  students: any[];
  initialFilter?: string;
}

// ─── Yardımcılar ─────────────────────────────────────────────

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Ana bileşen ─────────────────────────────────────────────

export function GorusmelerClient({ initialMeetings, students, initialFilter }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [filter, setFilter] = useState(initialFilter ?? '');
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const globallyFiltered = meetings.filter((m) => matchesFilter(m.students));
  const filtered = filter ? globallyFiltered.filter((m) => m.student_id === filter) : globallyFiltered;
  const now = new Date();
  const upcoming = filtered.filter((m) => new Date(m.scheduled_at) >= now);
  const past = filtered.filter((m) => new Date(m.scheduled_at) < now);

  // ── Güncelleme ──
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
      .select('*, students(full_name, track)')
      .single();

    if (data) setMeetings((prev) => prev.map((m) => m.id === editing.id ? data : m));
    setSaving(false);
    setEditing(null);
  }

  // ── Silme ──
  async function handleDelete(id: string) {
    await (supabase.from('meetings') as any).delete().eq('id', id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Başlık */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Görüşme kayıtları</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{filtered.length} görüşme</p>
        </div>
        <Link
          href="/gorusmeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      {/* Öğrenci filtresi */}
      {students.filter((s: any) => matchesFilter(s)).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setFilter(''); router.push('/gorusmeler'); }}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${!filter ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'}`}
          >
            Tümü
          </button>
          {students.filter((s: any) => matchesFilter(s)).map((s: any) => (
            <button
              key={s.id}
              onClick={() => { setFilter(s.id); router.push(`/gorusmeler?ogrenci=${s.id}`); }}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${filter === s.id ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--border)]'}`}
            >
              {s.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <IconCalendar size={32} className="text-[var(--ink-muted)]" />
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz görüşme eklenmemiş.</p>
          <Link href="/gorusmeler/yeni" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">
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

      {/* ── Düzenleme modalı ── */}
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
                <input type="text" value={editing.topic ?? ''}
                  onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  placeholder="Haftalık takip, TYT değerlendirme..."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
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

      {/* ── Silme onayı ── */}
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

// ─── Görüşme grubu (satırlar) ─────────────────────────────────

function MeetingGroup({
  meetings,
  onEdit,
  onDelete,
}: {
  meetings: any[];
  onEdit: (m: any) => void;
  onDelete: (id: string) => void;
}) {
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
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          >
            {/* Tarih bloğu */}
            <div className="flex w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--paper)] py-1.5 leading-none">
              <span className="text-[10px] font-medium text-[var(--ink-muted)]">{monthShort}</span>
              <span className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{dayNum}</span>
            </div>

            {/* İsim + tür + saat — ayrı satırlar */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium text-[var(--ink)]">
                  {m.students?.full_name}
                </span>
                <span
                  className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isVeli
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                      : 'bg-[var(--track-yks-soft)] text-[var(--track-yks)]'
                  }`}
                >
                  {isVeli ? 'Veli' : 'Koç'}
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                {weekdayStr} · {timeStr} · {m.duration_minutes} dk
              </div>
            </div>

            {/* Konu — ayrı bir alan, dikey çizgiyle bölünmüş */}
            <div className="hidden w-36 flex-shrink-0 border-l border-[var(--border)] pl-4 md:block">
              {m.topic ? (
                <span className="line-clamp-2 text-[12.5px] text-[var(--ink)]">{m.topic}</span>
              ) : (
                <span className="text-[12.5px] text-[var(--ink-muted)]">Konu yok</span>
              )}
            </div>

            {/* Durum */}
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                m.completed
                  ? 'bg-[var(--success-soft)] text-[var(--success)]'
                  : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'
              }`}
            >
              {m.completed ? 'Tamamlandı' : 'Bekliyor'}
            </span>

            {/* Aksiyonlar */}
            <div className="flex flex-shrink-0 gap-1">
              <button
                onClick={() => onEdit(m)}
                title="Düzenle"
                className="rounded p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-dark)]"
              >
                <IconEdit size={15} />
              </button>
              <button
                onClick={() => onDelete(m.id)}
                title="Sil"
                className="rounded p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              >
                <IconTrash size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}