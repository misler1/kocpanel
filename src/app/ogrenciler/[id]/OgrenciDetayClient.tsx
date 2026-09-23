'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatTurkishNumber } from '@/lib/format';
import {
  IconChevronDown, IconChevronUp,
  IconCalendar, IconChartBar, IconCheckbox, IconBooks,
  IconUser, IconUsers, IconPhone, IconSchool, IconTrophy,
  IconEdit, IconTrash, IconNotebook, IconTarget,
} from '@tabler/icons-react';

// ─── Sabitler ────────────────────────────────────────────────

const TRACK_LABELS: Record<string, string> = {
  YKS_SAY: 'YKS · Sayısal', YKS_SOZ: 'YKS · Sözel', YKS_EA: 'YKS · Eşit Ağırlık',
  YKS_DIL: 'YKS · Dil', LGS: 'LGS', DIGER: 'Diğer',
};
const RANK_TYPE_LABELS: Record<string, string> = {
  TYT: 'TYT', SAY: 'Sayısal', SOZ: 'Sözel', EA: 'Eşit Ağırlık',
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



const TRACK_RESOURCES: Record<string, string[]> = {
  YKS_SAY: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji',
  ],
  YKS_EA: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Matematik', 'AYT Geometri', 'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya',
  ],
  YKS_SOZ: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü',
    'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya', 'AYT Felsefe', 'AYT Din Kültürü',
  ],
  YKS_DIL: [
    'TYT Türkçe', 'TYT Paragraf', 'TYT Matematik', 'TYT Geometri',
    'TYT Fizik', 'TYT Kimya', 'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya',
    'TYT Felsefe', 'TYT Din Kültürü', 'YDT İngilizce',
  ],
  LGS: [
    'Türkçe', 'Paragraf', 'Matematik', 'Fen Bilgisi',
    'İnkılap Tarihi', 'Din Kültürü', 'İngilizce',
  ],
  DIGER: [],
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
              {student.sinif_sube && <span className="text-[12px] text-gray-400">· {student.sinif_sube}</span>}
              {student.okul && (
                <div className="mt-1 text-[12px] text-gray-500">
                  {student.grade_level === 'Mezun' ? '🎓 Mezun olduğu okul: ' : '🏫 Devam ettiği okul: '}
                  {student.okul}
                </div>
            )}
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
                <div className="text-[18px] font-semibold text-gray-900">{formatTurkishNumber(f.value)}</div>
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


      {/* ── Hedef ── */}
            {(student.target_university || student.target_department || student.target_rank) && (
              <Accordion icon={<IconTarget size={16} />} title="Hedef">
                <div className="space-y-1">
                  <InfoRow label="Hedef Üniversite" value={student.target_university} />
                  <InfoRow label="Hedef Bölüm" value={student.target_department} />
                  {student.target_rank && (
                    <InfoRow
                      label="Hedef Sıralama"
                      value={`${Number(student.target_rank).toLocaleString('tr-TR')} (${RANK_TYPE_LABELS[student.target_rank_type] ?? student.target_rank_type})`}
                    />
                  )}
                </div>
              </Accordion>
      )}

      {/* ── Kaynaklar ── */}
      {hasResources && (
        <Accordion icon={<IconSchool size={16} />} title="Kullanılan Kaynaklar">
          <div className="space-y-3">
            {(TRACK_RESOURCES[student.track] ?? Object.keys(resources)).map((subject) => {
              const books = resources[subject];
              if (!books) return null;
              const filled = books.filter(Boolean);
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
          <Link href={`/gorusmeler/${id}`} className="text-[12px] text-gray-400 hover:underline">
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

type TopicStudy = { subject: string; topic: string; resource: string; duration_minutes: number };
type QuestionSolved = { subject: string; topic: string; resource: string; count: number };
type ExamEntry = { subject: string; exam_name: string; net: number };
type BookReading = { book_name: string; pages: number };

type LogForm = {
  id?: string;
  log_date: string;
  topic_studies: TopicStudy[];
  question_solved: QuestionSolved[];
  exams: ExamEntry[];
  book_reading: BookReading[];
  raw_message: string;
};

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm(): LogForm {
  return {
    log_date: todayStr(),
    topic_studies: [{ subject: '', topic: '', resource: '', duration_minutes: 0 }],
    question_solved: [{ subject: '', topic: '', resource: '', count: 0 }],
    exams: [{ subject: '', exam_name: '', net: 0 }],
    book_reading: [{ book_name: '', pages: 0 }],
    raw_message: '',
  };
}

function logToForm(log: any): LogForm {
  return {
    id: log.id,
    log_date: log.log_date,
    topic_studies: log.topic_studies?.length ? log.topic_studies : [{ subject: '', topic: '', resource: '', duration_minutes: 0 }],
    question_solved: log.question_solved?.length ? log.question_solved : [{ subject: '', topic: '', resource: '', count: 0 }],
    exams: log.exams?.length ? log.exams : [{ subject: '', exam_name: '', net: 0 }],
    book_reading: log.book_reading?.length ? log.book_reading : [{ book_name: '', pages: 0 }],
    raw_message: log.raw_message ?? '',
  };
}

function GunlukAccordion({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LogForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  // Accordion açılır açılmaz otomatik yükle
  useState(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('daily_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('log_date', { ascending: false })
        .limit(30);
      console.log('daily_logs data:', data);
      console.log('daily_logs error:', error);
      setLogs(data ?? []);
      setLoaded(true);
      if (data && data.length > 0) setSelectedLog(data[0]);
    })();
    return undefined;
  });

  function openNew() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(log: any) {
    setForm(logToForm(log));
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      student_id: studentId,
      log_date: form.log_date,
      source: 'manual',
      topic_studies: form.topic_studies.filter((t) => t.topic),
      question_solved: form.question_solved.filter((q) => q.topic),
      exams: form.exams.filter((x) => x.exam_name),
      book_reading: form.book_reading.filter((b) => b.book_name),
      raw_message: form.raw_message || null,
    };

    if (form.id) {
      const { data } = await (supabase.from('daily_logs') as any)
        .update(payload)
        .eq('id', form.id)
        .select()
        .single();
      if (data) {
        setLogs((prev) => prev.map((l) => (l.id === form.id ? data : l)));
        setSelectedLog(data);
      }
    } else {
      const { data: existing } = await (supabase as any)
        .from('daily_logs')
        .select('id')
        .eq('student_id', studentId)
        .eq('log_date', form.log_date)
        .maybeSingle();

      if (existing) {
        const { data } = await (supabase.from('daily_logs') as any)
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (data) {
          setLogs((prev) => prev.map((l) => (l.id === existing.id ? data : l)));
          setSelectedLog(data);
        }
      } else {
        const { data } = await (supabase.from('daily_logs') as any)
          .insert(payload)
          .select()
          .single();
        if (data) {
          const next = [data, ...logs].sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
          setLogs(next);
          setSelectedLog(data);
        }
      }
    }

    setSaving(false);
    setFormOpen(false);
  }

  async function handleDelete(id: string) {
    await (supabase.from('daily_logs') as any).delete().eq('id', id);
    const next = logs.filter((l) => l.id !== id);
    setLogs(next);
    if (selectedLog?.id === id) setSelectedLog(next[0] ?? null);
    setDeletingId(null);
  }

  return (
    <Accordion icon={<IconNotebook size={16} />} title="Günlük">
      <div className="mb-3 flex justify-end">
        <button
          onClick={openNew}
          className="text-[12px] font-medium text-blue-600 hover:underline"
        >
          + Günlük Çalışma Ekle
        </button>
      </div>

      {!loaded ? (
        <p className="text-[13px] text-gray-400">Yükleniyor...</p>
      ) : logs.length === 0 ? (
        <p className="text-[13px] text-gray-400">Henüz günlük kaydı yok.</p>
      ) : (
        <div className="flex gap-3">
          <div className="w-32 flex-shrink-0 space-y-1">
            {logs.map((log: any) => {
              const d = new Date(log.log_date);
              const isSelected = selectedLog?.id === log.id;
              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-[12px] transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  {log.source === 'whatsapp' && <span className="ml-1 text-[10px]">📱</span>}
                </button>
              );
            })}
          </div>

          {selectedLog && (
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-gray-400">
                  {new Date(selectedLog.log_date).toLocaleDateString('tr-TR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(selectedLog)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    title="Düzenle"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    onClick={() => setDeletingId(selectedLog.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    title="Sil"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {selectedLog.topic_studies?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">📚 Konu Çalışma</p>
                  <div className="space-y-1">
                    {selectedLog.topic_studies.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-[13px] text-gray-700">
                          {t.subject ? `${t.subject} · ` : ''}{t.topic}
                          {t.resource && <span className="text-gray-400"> ({t.resource})</span>}
                        </span>
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
                        <span className="text-[13px] text-gray-700">
                          {q.subject ? `${q.subject} · ` : ''}{q.topic}
                          {q.resource && <span className="text-gray-400"> ({q.resource})</span>}
                        </span>
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
                        <span className="text-[13px] text-gray-700">
                          {e.subject ? `${e.subject} · ` : ''}{e.exam_name}
                        </span>
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

      {/* ── Ekle / Düzenle modalı ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              {form.id ? 'Günlük kaydını düzenle' : 'Günlük çalışma ekle'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tarih</label>
                <input
                  type="date"
                  value={form.log_date}
                  onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <ListEditor
                title="📚 Konu Çalışma"
                items={form.topic_studies}
                onChange={(items) => setForm({ ...form, topic_studies: items })}
                fields={[
                  { key: 'subject', placeholder: 'Ders (örn. Matematik)', type: 'text' },
                  { key: 'topic', placeholder: 'Konu (örn. Üslü Sayılar)', type: 'text' },
                  { key: 'resource', placeholder: 'Kaynak (opsiyonel)', type: 'text' },
                  { key: 'duration_minutes', placeholder: 'Dakika', type: 'number' },
                ]}
                empty={{ subject: '', topic: '', resource: '', duration_minutes: 0 }}
              />

              <ListEditor
                title="✏️ Soru Çözümü"
                items={form.question_solved}
                onChange={(items) => setForm({ ...form, question_solved: items })}
                fields={[
                  { key: 'subject', placeholder: 'Ders (örn. Türkçe)', type: 'text' },
                  { key: 'topic', placeholder: 'Konu (örn. Paragraf)', type: 'text' },
                  { key: 'resource', placeholder: 'Kaynak (opsiyonel)', type: 'text' },
                  { key: 'count', placeholder: 'Soru sayısı', type: 'number' },
                ]}
                empty={{ subject: '', topic: '', resource: '', count: 0 }}
              />

              <ListEditor
                title="📝 Deneme"
                items={form.exams}
                onChange={(items) => setForm({ ...form, exams: items })}
                fields={[
                  { key: 'subject', placeholder: 'Ders (opsiyonel)', type: 'text' },
                  { key: 'exam_name', placeholder: 'Deneme adı', type: 'text' },
                  { key: 'net', placeholder: 'Net', type: 'number' },
                ]}
                empty={{ subject: '', exam_name: '', net: 0 }}
              />

              <ListEditor
                title="📖 Kitap Okuma"
                items={form.book_reading}
                onChange={(items) => setForm({ ...form, book_reading: items })}
                fields={[
                  { key: 'book_name', placeholder: 'Kitap adı', type: 'text' },
                  { key: 'pages', placeholder: 'Sayfa', type: 'number' },
                ]}
                empty={{ book_name: '', pages: 0 }}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Not (opsiyonel)</label>
                <textarea
                  rows={2}
                  value={form.raw_message}
                  onChange={(e) => setForm({ ...form, raw_message: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Serbest not..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
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
            <h3 className="mb-2 text-base font-semibold text-gray-900">Günlük kaydını sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu güne ait kayıt kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}
    </Accordion>
  );
}

// ─── Dinamik satır ekleyici (Konu/Soru/Deneme/Kitap listeleri için) ──

function ListEditor<T extends Record<string, any>>({
  title, items, onChange, fields, empty,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: { key: keyof T; placeholder: string; type: 'text' | 'number' }[];
  empty: T;
}) {
  function updateItem(index: number, key: keyof T, value: string) {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addItem() {
    onChange([...items, { ...empty }]);
  }

    return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        <button
          type="button"
          onClick={addItem}
          className="text-[12px] text-blue-600 hover:underline"
        >
          + Ekle
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
            <div className="flex flex-wrap items-end gap-1.5">
              {fields.map((f) => (
                <div key={String(f.key)} className={f.type === 'number' ? 'w-20' : 'min-w-[110px] flex-1'}>
                  <label className="mb-0.5 block text-[10px] text-gray-400">{f.placeholder}</label>
                  <input
                    type={f.type}
                    value={item[f.key] ?? ''}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                >
                  <IconTrash size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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