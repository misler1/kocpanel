'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconCalendar, IconEdit, IconTrash } from '@tabler/icons-react';

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

  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [filter, setFilter] = useState(initialFilter ?? '');
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = filter ? meetings.filter((m) => m.student_id === filter) : meetings;
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
          <h1 className="text-[18px] font-medium text-gray-900">Görüşme kayıtları</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{filtered.length} görüşme</p>
        </div>
        <Link
          href="/gorusmeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      {/* Öğrenci filtresi */}
      {students.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setFilter(''); router.push('/gorusmeler'); }}
            className={`rounded-full px-3 py-1 text-[12px] font-medium ${!filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tümü
          </button>
          {students.map((s: any) => (
            <button
              key={s.id}
              onClick={() => { setFilter(s.id); router.push(`/gorusmeler?ogrenci=${s.id}`); }}
              className={`rounded-full px-3 py-1 text-[12px] font-medium ${filter === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-20">
          <IconCalendar size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">Henüz görüşme eklenmemiş.</p>
          <Link href="/gorusmeler/yeni" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            İlk görüşmeyi ekle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Yaklaşan</h2>
              <MeetingGroup
                meetings={upcoming}
                onEdit={(m) => setEditing({ ...m, scheduled_at_local: toLocalDatetime(m.scheduled_at) })}
                onDelete={(id) => setDeletingId(id)}
              />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Geçmiş</h2>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Görüşmeyi düzenle</h3>
            <form onSubmit={handleUpdate} className="space-y-3">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Görüşme türü</label>
                <div className="flex gap-4">
                  {[{ value: 'ogrenci', label: 'Öğrenci' }, { value: 'veli', label: 'Veli' }].map((t) => (
                    <label key={t.value} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" value={t.value} checked={editing.meeting_type === t.value}
                        onChange={() => setEditing({ ...editing, meeting_type: t.value })}
                        className="accent-blue-600" />
                      <span className="text-sm text-gray-700">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tarih & Saat</label>
                <input type="datetime-local" value={editing.scheduled_at_local}
                  onChange={(e) => setEditing({ ...editing, scheduled_at_local: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Süre (dakika)</label>
                <input type="number" min={5} max={180} value={editing.duration_minutes}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Konu</label>
                <input type="text" value={editing.topic ?? ''}
                  onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  placeholder="Haftalık takip, TYT değerlendirme..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
                <textarea rows={3} value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Görüşme notları..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={editing.completed}
                  onChange={(e) => setEditing({ ...editing, completed: e.target.checked })}
                  className="h-4 w-4 accent-blue-600" />
                <span className="text-sm text-gray-700">Tamamlandı olarak işaretle</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Silme onayı ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Görüşmeyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu görüşme kalıcı olarak silinecek. Geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Vazgeç
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
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
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {meetings.map((m: any) => {
        const dt = new Date(m.scheduled_at);
        const dateStr = dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const isVeli = m.meeting_type === 'veli';

        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            {/* Tür rozeti */}
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-medium ${isVeli ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              {isVeli ? 'VELİ' : 'KOÇ'}
            </div>

            {/* Bilgiler */}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-gray-900">{m.students?.full_name}</div>
              <div className="text-[12px] text-gray-500">
                {dateStr} · {timeStr} · {m.duration_minutes} dk
              </div>
              {m.topic && <div className="mt-0.5 text-[12px] text-gray-400">{m.topic}</div>}
              {m.notes && <div className="mt-0.5 text-[12px] text-gray-400 italic line-clamp-1">{m.notes}</div>}
            </div>

            {/* Durum */}
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {m.completed ? 'Tamamlandı' : 'Bekliyor'}
            </span>

            {/* Aksiyonlar */}
            <div className="flex flex-shrink-0 gap-1">
              <button
                onClick={() => onEdit(m)}
                title="Düzenle"
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
              >
                <IconEdit size={15} />
              </button>
              <button
                onClick={() => onDelete(m.id)}
                title="Sil"
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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
