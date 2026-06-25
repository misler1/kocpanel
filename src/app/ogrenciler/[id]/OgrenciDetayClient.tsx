'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconChevronDown, IconChevronUp,
  IconCalendar, IconChartBar, IconCheckbox, IconBooks,
  IconUser, IconUsers, IconPhone, IconSchool, IconTrophy,
  IconEdit, IconTrash, IconNotebook,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// ─── Sabitler ────────────────────────────────────────────────

const TRACK_LABELS: Record<string, string> = {
  YKS_SAY: 'YKS · Sayısal', YKS_SOZ: 'YKS · Sözel', YKS_EA: 'YKS · Eşit Ağırlık',
  YKS_DIL: 'YKS · Dil', LGS: 'LGS', DIGER: 'Diğer',
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aktif: { label: 'Aktif', className: 'bg-[#EAF3DE] text-[#3B6D11]' },
  gorusme_bekliyor: { label: 'Görüşme yok', className: 'bg-[#FAEEDA] text-[#854F0B]' },
  analiz_eksik: { label: 'Analiz yok', className: 'bg-[#FCEBEB] text-[#A32D2D]' },
  dikkat: { label: 'Dikkat', className: 'bg-[#FCEBEB] text-[#A32D2D]' },
  pasif: { label: 'Pasif', className: 'bg-gray-100 text-gray-500' },
};

const AVATAR_COLORS: Record<string, string> = {
  'av-blue': 'bg-[#E6F1FB] text-[#185FA5]',
  'av-teal': 'bg-[#E1F5EE] text-[#0F6E56]',
  'av-purple': 'bg-[#EEEDFE] text-[#534AB7]',
  'av-amber': 'bg-[#FAEEDA] text-[#854F0B]',
  'av-coral': 'bg-[#FAECE7] text-[#993C1D]',
};

// ─── Accordion ───────────────────────────────────────────────

function Accordion({
  icon, title, defaultOpen = false, children,
}: {
  icon: React.ReactNode; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5">
        <span className="text-gray-400">{icon}</span>
        <span className="flex-1 text-left text-sm font-medium text-gray-900">{title}</span>
        {open
          ? <IconChevronUp size={16} className="flex-shrink-0 text-gray-400" />
          : <IconChevronDown size={16} className="flex-shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">{children}</div>
      )}
    </div>
  );
}

// ─── InfoRow ─────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="w-36 flex-shrink-0 text-[12px] text-gray-400">{label}</span>
      <span className="text-[13px] text-gray-800">{value}</span>
    </div>
  );
}

// ─── Ana bileşen ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OgrenciDetayClient({ student, meetings, exams, tasks }: {
  student: any; meetings: any[]; exams: any[]; tasks: any[];
}) {
  const initials = student.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarClass = AVATAR_COLORS[student.avatar_color] ?? AVATAR_COLORS['av-blue'];
  const status = STATUS_MAP[student.status] ?? STATUS_MAP['aktif'];
  const id = student.id;

  const birthDateFormatted = student.birth_date
    ? new Date(student.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const resources: Record<string, [string, string, string]> = student.resources ?? {};
  const hasResources = Object.values(resources).some((arr) => arr.some(Boolean));
  const hasYks = student.tyt_score || student.say_score || student.ea_score || student.soz_score
    || student.tyt_rank || student.say_rank || student.ea_rank || student.soz_rank;
  const hasFamily = student.mother_name || student.father_name;
  const hasGuardian = student.guardian_name;

  return (
    <div className="space-y-3">

      {/* ── Profil kartı ── */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl font-semibold ${avatarClass}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium text-gray-900">{student.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">{TRACK_LABELS[student.track] ?? student.track}</span>
              {student.grade_level && <span className="text-[12px] text-gray-400">· {student.grade_level}</span>}
            </div>
          </div>
          <span className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {student.phone && (
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
              <IconPhone size={13} />{student.phone}
            </div>
          )}
          {birthDateFormatted && (
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
              <IconUser size={13} />{birthDateFormatted}
            </div>
          )}
        </div>
        {student.notes && (
          <p className="mt-3 rounded-lg bg-gray-50 p-3 text-[13px] text-gray-600">{student.notes}</p>
        )}
      </div>

      {/* ── Aile & Veli ── */}
      {(hasFamily || hasGuardian) && (
        <Accordion icon={<IconUsers size={16} />} title="Aile & Veli Bilgileri">
          {student.mother_name && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Anne</p>
              <InfoRow label="Ad Soyad" value={student.mother_name} />
              <InfoRow label="Meslek" value={student.mother_job} />
              <InfoRow label="Telefon" value={student.mother_phone} />
            </div>
          )}
          {student.father_name && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Baba</p>
              <InfoRow label="Ad Soyad" value={student.father_name} />
              <InfoRow label="Meslek" value={student.father_job} />
              <InfoRow label="Telefon" value={student.father_phone} />
            </div>
          )}
          {student.guardian_name && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Veli</p>
              <InfoRow label="Ad Soyad" value={student.guardian_name} />
              <InfoRow label="Telefon" value={student.guardian_phone} />
              <InfoRow label="Yakınlık" value={student.guardian_relation} />
            </div>
          )}
        </Accordion>
      )}

      {/* ── YKS Sonuçları ── */}
      {hasYks && (
        <Accordion icon={<IconTrophy size={16} />} title={`YKS Sonuçları ${student.yks_year ? `(${student.yks_year})` : ''}`}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            {[
              { label: 'TYT Puan', value: student.tyt_score },
              { label: 'Sayısal Puan', value: student.say_score },
              { label: 'Eşit Ağırlık Puan', value: student.ea_score },
              { label: 'Sözel Puan', value: student.soz_score },
            ].filter(f => f.value).map((f) => (
              <div key={f.label} className="rounded-lg bg-gray-50 px-3 py-2.5 text-center">
                <div className="text-[11px] text-gray-400">{f.label}</div>
                <div className="text-[18px] font-semibold text-gray-900">{f.value}</div>
              </div>
            ))}
          </div>
          {(student.tyt_rank || student.say_rank || student.ea_rank || student.soz_rank) && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
              {[
                { label: 'TYT Sıralama', value: student.tyt_rank },
                { label: 'Sayısal Sıralama', value: student.say_rank },
                { label: 'EA Sıralama', value: student.ea_rank },
                { label: 'Sözel Sıralama', value: student.soz_rank },
              ].filter(f => f.value).map((f) => (
                <div key={f.label} className="rounded-lg border border-gray-100 px-3 py-2.5 text-center">
                  <div className="text-[11px] text-gray-400">{f.label}</div>
                  <div className="text-[15px] font-medium text-gray-700">{f.value.toLocaleString('tr-TR')}</div>
                </div>
              ))}
            </div>
          )}
        </Accordion>
      )}

      {/* ── Kaynaklar ── */}
      {hasResources && (
        <Accordion icon={<IconSchool size={16} />} title="Kullanılan Kaynaklar">
          <div className="space-y-3">
            {Object.entries(resources).map(([subject, books]) => {
              const filled = (books as string[]).filter(Boolean);
              if (!filled.length) return null;
              return (
                <div key={subject}>
                  <p className="mb-1 text-[12px] font-medium text-gray-700">{subject}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filled.map((b, i) => (
                      <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] text-blue-700">{b}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Accordion>
      )}

      {/* ── Görüşmeler ── */}
      <Accordion icon={<IconCalendar size={16} />} title="Son Görüşmeler" defaultOpen>
        <div className="mb-2 flex justify-end">
          <Link href={`/gorusmeler/yeni?ogrenci=${id}`} className="text-[12px] text-blue-600 hover:underline">
            + Görüşme ekle
          </Link>
        </div>
        <MeetingList meetings={meetings} studentId={id} />
        <div className="mt-2">
          <Link href={`/gorusmeler?ogrenci=${id}`} className="text-[12px] text-gray-400 hover:underline">
            Tüm görüşmeleri gör →
          </Link>
        </div>
      </Accordion>

      {/* ── Denemeler ── */}
      <Accordion icon={<IconChartBar size={16} />} title="Son Denemeler" defaultOpen>
        <div className="mb-2 flex justify-end">
          <Link href={`/denemeler/yeni?ogrenci=${id}`} className="text-[12px] text-blue-600 hover:underline">
            + Deneme ekle
          </Link>
        </div>
        {exams.length === 0 ? (
          <p className="text-[13px] text-gray-400">Henüz deneme eklenmemiş.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {exams.map((e: any) => {
              const pct = Math.round((e.net_score / e.max_score) * 100);
              const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-900">{e.exam_name}</div>
                    <div className="text-[12px] text-gray-400">
                      {new Date(e.exam_date).toLocaleDateString('tr-TR')}
                      {e.analysis_done ? ' · Analiz ✓' : ' · Analiz bekliyor'}
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-[14px] font-semibold text-gray-700">{e.net_score} net</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2">
          <Link href={`/denemeler?ogrenci=${id}`} className="text-[12px] text-gray-400 hover:underline">
            Tüm denemeleri gör →
          </Link>
        </div>
      </Accordion>

      {/* ── Görevler & Takip ── */}
      <Accordion icon={<IconCheckbox size={16} />} title="Bekleyen Görevler & Takip">
        {tasks.length > 0 && (
          <div className="mb-3 divide-y divide-gray-100">
            {tasks.map((t: any) => (
              <div key={t.id} className="py-2 text-[13px] text-gray-700">{t.title}</div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: `/soru-takibi?ogrenci=${id}`, label: '📊 Soru takibi', icon: IconCheckbox },
            { href: `/konu-ilerleyisi?ogrenci=${id}`, label: '📚 Konu ilerleyişi', icon: IconBooks },
            { href: `/gorusmeler?ogrenci=${id}`, label: '📅 Tüm görüşmeler', icon: IconCalendar },
            { href: `/denemeler?ogrenci=${id}`, label: '📈 Tüm denemeler', icon: IconChartBar },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="rounded-lg border border-gray-200 px-3 py-2 text-center text-[12px] text-gray-600 hover:bg-gray-50">
              {a.label}
            </Link>
          ))}
        </div>
      </Accordion>

      {/* ── Günlük ── */}
      <GunlukAccordion studentId={id} />

    </div>
  );
}

// ─── Günlük Accordion ────────────────────────────────────────

function GunlukAccordion({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const supabase = createClient();

  async function load() {
    if (loaded) return;
    const { data, error } = await (supabase as any)
      .from('daily_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('log_date', { ascending: false })
      .limit(30);
    console.log("daily_logs data:", data);
    console.log("daily_logs error:", error);
    setLogs(data ?? []);
    setLoaded(true);
    if (data && data.length > 0) setSelectedLog(data[0]);
  }
  return (
    <Accordion icon={<IconNotebook size={16} />} title="Günlük">
      {!loaded ? (
        <button onClick={load}
          className="w-full rounded-lg border border-dashed border-gray-200 py-3 text-[13px] text-gray-400 hover:border-blue-300 hover:text-blue-500">
          Günlükleri görüntüle
        </button>
      ) : logs.length === 0 ? (
        <p className="text-[13px] text-gray-400">Henüz günlük kaydı yok.</p>
      ) : (
        <div className="flex gap-3">
          <div className="w-32 flex-shrink-0 space-y-1">
            {logs.map((log: any) => {
              const d = new Date(log.log_date);
              const isSelected = selectedLog?.id === log.id;
              return (
                <button key={log.id} onClick={() => setSelectedLog(log)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-[12px] transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  {log.source === 'whatsapp' && <span className="ml-1 text-[10px]">📱</span>}
                </button>
              );
            })}
          </div>

          {selectedLog && (
            <div className="flex-1 min-w-0 space-y-3">
              <div className="text-[12px] text-gray-400">
                {new Date(selectedLog.log_date).toLocaleDateString('tr-TR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </div>

              {selectedLog.topic_studies?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">📚 Konu Çalışma</p>
                  <div className="space-y-1">
                    {selectedLog.topic_studies.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-[13px] text-gray-700">{t.topic}</span>
                        <span className="text-[12px] text-gray-400">
                          {t.duration_minutes >= 60
                            ? `${Math.floor(t.duration_minutes / 60)} saat${t.duration_minutes % 60 ? ` ${t.duration_minutes % 60} dk` : ''}`
                            : `${t.duration_minutes} dk`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.question_solved?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">✏️ Soru Çözümü</p>
                  <div className="space-y-1">
                    {selectedLog.question_solved.map((q: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-[13px] text-gray-700">{q.topic}</span>
                        <span className="text-[12px] text-gray-400">{q.count} soru</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.exams?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">📝 Deneme</p>
                  <div className="space-y-1">
                    {selectedLog.exams.map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-[13px] text-gray-700">{e.exam_name}</span>
                        <span className="text-[12px] text-gray-400">{e.net} net</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.book_reading?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">📖 Kitap Okuma</p>
                  <div className="space-y-1">
                    {selectedLog.book_reading.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-[13px] text-gray-700">{b.book_name}</span>
                        <span className="text-[12px] text-gray-400">{b.pages} sayfa</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.raw_message && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600">
                    Orijinal mesajı gör
                  </summary>
                  <p className="mt-2 rounded-lg bg-gray-50 p-3 text-[12px] text-gray-600 italic">
                    {selectedLog.raw_message}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </Accordion>
  );
}

// ─── Görüşme listesi (düzenle / sil) ────────────────────────

function MeetingList({ meetings, studentId }: { meetings: any[]; studentId: string }) {
  const [items, setItems] = useState<any[]>(meetings);
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();
  void studentId;

  if (items.length === 0) return <p className="text-[13px] text-gray-400">Henüz görüşme yok.</p>;

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('meetings') as any).delete().eq('id', id);
    setItems((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('meetings') as any)
      .update({
        scheduled_at: new Date(editing.scheduled_at_local).toISOString(),
        topic: editing.topic || null,
        notes: editing.notes || null,
        duration_minutes: Number(editing.duration_minutes),
        completed: editing.completed,
      })
      .eq('id', editing.id).select().single();
    if (data) setItems((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...data } : m));
    setEditing(null);
  }

  function toLocalDatetime(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {items.map((m: any) => (
          <div key={m.id} className="py-2.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-900">
                  {new Date(m.scheduled_at).toLocaleDateString('tr-TR', {
                    weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                  {m.completed && <span className="ml-2 text-[11px] text-emerald-600">✓ Tamamlandı</span>}
                </div>
                {m.topic && <div className="text-[12px] text-gray-500">{m.topic}</div>}
                {m.notes && <div className="mt-0.5 text-[12px] text-gray-400 italic">{m.notes}</div>}
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <button onClick={() => setEditing({ ...m, scheduled_at_local: toLocalDatetime(m.scheduled_at) })}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Düzenle">
                  <IconEdit size={14} />
                </button>
                <button onClick={() => setDeletingId(m.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500" title="Sil">
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Görüşmeyi düzenle</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tarih & Saat</label>
                <input type="datetime-local" value={editing.scheduled_at_local}
                  onChange={(e) => setEditing({ ...editing, scheduled_at_local: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Süre (dk)</label>
                <input type="number" value={editing.duration_minutes}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Konu</label>
                <input type="text" value={editing.topic ?? ''}
                  onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notlar</label>
                <textarea rows={2} value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={editing.completed}
                  onChange={(e) => setEditing({ ...editing, completed: e.target.checked })}
                  className="accent-blue-600" />
                Tamamlandı olarak işaretle
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Görüşmeyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu görüşme kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">Vazgeç</button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">Evet, sil</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}