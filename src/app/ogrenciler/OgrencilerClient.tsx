'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Student } from '@/types/database';
import { IconArchive, IconChevronRight, IconPlus, IconUsers } from '@tabler/icons-react';
import { PageHero } from '@/components/ui/PageHero';
import { avatarColor, initials as initialsOf, trackPill } from '@/lib/ui-colors';


const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aktif: { label: 'Aktif', className: 'bg-[var(--success-soft)] text-[var(--success)]' },
  gorusme_bekliyor: { label: 'Görüşme yok', className: 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' },
  analiz_eksik: { label: 'Analiz yok', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  dikkat: { label: 'Dikkat', className: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  pasif: { label: 'Arşiv', className: 'bg-[var(--paper)] text-[var(--ink-muted)]' },
};



type SortKey = 'ad' | 'soyad' | 'sinif' | 'dogum' | 'gorusme_yeni' | 'gorusme_eski';

type ListedStudent = Student & {
  birth_date?: string | null;
  last_meeting_at?: string | null;
  sinif_sube?: string | null;
  is_intern_student?: boolean;
  responsible_coach_other_name?: string | null;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ad', label: 'Ada göre (A-Z)' },
  { value: 'soyad', label: 'Soyada göre (A-Z)' },
  { value: 'sinif', label: 'Sınıfa göre' },
  { value: 'dogum', label: 'Doğum tarihine göre' },
  { value: 'gorusme_yeni', label: 'Son görüşme (yeniden eskiye)' },
  { value: 'gorusme_eski', label: 'Son görüşme (eskiden yeniye)' },
];

function getSoyad(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

export function OgrencilerClient({ students, archiveMode }: { students: ListedStudent[]; archiveMode: boolean }) {
  const [accBusy, setAccBusy] = useState(false);
  const [accMsg, setAccMsg] = useState<string | null>(null);

  // Henüz giriş hesabı olmayan öğrenciler için hesap oluşturur (telefon + doğum tarihi gerekir).
  async function createStudentAccounts() {
    if (!window.confirm('Giriş hesabı olmayan öğrencilerin hesapları oluşturulsun mu?\nKullanıcı adı: telefon · İlk şifre: telefonun son 4 hanesi + doğum yılı')) return;
    setAccBusy(true);
    setAccMsg(null);
    try {
      const res = await fetch('/api/ogrenci/hesap-olustur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (!res.ok) { setAccMsg(json.error ?? 'Hesaplar oluşturulamadı.'); return; }
      const results: { name: string; status: string; reason?: string }[] = json.results ?? [];
      const ok = results.filter((r) => r.status === 'olusturuldu').length;
      const skipped = results.filter((r) => r.status !== 'olusturuldu');
      setAccMsg(
        `${ok} hesap oluşturuldu.` +
        (skipped.length ? ` Atlananlar: ${skipped.map((r) => `${r.name} (${r.reason})`).join(', ')}` : '')
      );
    } catch {
      setAccMsg('Bağlantı hatası, tekrar deneyin.');
    } finally {
      setAccBusy(false);
    }
  }

  const { matchesFilter } = useExamFilter();
  const [sinifFilter, setSinifFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ad');

  const examFiltered = useMemo(
    () => students.filter((s) => matchesFilter(s)),
    [students, matchesFilter]
  );

  const availableSiniflar = useMemo(() => {
    const set = new Set<string>();
    examFiltered.forEach((s) => {
      if (s.sinif_sube && s.sinif_sube.trim()) set.add(s.sinif_sube.trim());
    });
    return Array.from(set).sort();
  }, [examFiltered]);

  const filtered = useMemo(() => {
    let list = examFiltered;
    if (sinifFilter) {
      list = list.filter((s) => s.sinif_sube === sinifFilter);
    }

    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'ad':
          return a.full_name.localeCompare(b.full_name, 'tr');
        case 'soyad':
          return getSoyad(a.full_name).localeCompare(getSoyad(b.full_name), 'tr');
        case 'sinif':
          return (a.sinif_sube ?? '').localeCompare(b.sinif_sube ?? '', 'tr');
        case 'dogum':
          if (!a.birth_date && !b.birth_date) return 0;
          if (!a.birth_date) return 1;
          if (!b.birth_date) return -1;
          return a.birth_date.localeCompare(b.birth_date);
        case 'gorusme_yeni':
          if (!a.last_meeting_at && !b.last_meeting_at) return 0;
          if (!a.last_meeting_at) return 1;
          if (!b.last_meeting_at) return -1;
          return b.last_meeting_at.localeCompare(a.last_meeting_at);
        case 'gorusme_eski':
          if (!a.last_meeting_at && !b.last_meeting_at) return 0;
          if (!a.last_meeting_at) return -1;
          if (!b.last_meeting_at) return 1;
          return a.last_meeting_at.localeCompare(b.last_meeting_at);
        default:
          return 0;
      }
    });

    return sorted;
  }, [examFiltered, sinifFilter, sortKey]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHero
        theme="sky"
        icon={<IconUsers size={22} />}
        title={archiveMode ? 'Arşivdeki öğrenciler' : 'Öğrenciler'}
        subtitle={archiveMode ? `${filtered.length} arşivde öğrenci` : `${filtered.length} aktif öğrenci`}
        actions={archiveMode ? (
          <Link
            href="/ogrenciler"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
          >
            Öğrencilere dön
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={createStudentAccounts}
              disabled={accBusy}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] disabled:opacity-60"
            >
              {accBusy ? 'Oluşturuluyor...' : 'Öğrenci Hesapları Oluştur'}
            </button>
            <Link
              href="/ogrenciler?arsiv=1"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
            >
              <IconArchive size={15} />
              Arşivden Öğrenci Al
            </Link>
            <Link
              href="/ogrenciler/yeni"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <IconPlus size={15} />
              Öğrenci ekle
            </Link>
          </>
        )}
      />

      {accMsg && (
        <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2 text-[13px] text-[var(--ink)]">{accMsg}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {availableSiniflar.length > 0 && (
          <select
            value={sinifFilter}
            onChange={(e) => setSinifFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
          >
            <option value="">Tüm sınıflar</option>
            {availableSiniflar.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <p className="text-[13px] text-[var(--ink-muted)]">
            {archiveMode ? 'Arşivde öğrenci yok.' : 'Bu filtrede öğrenci yok.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => <StudentRow key={s.id} student={s} />)}
        </div>
      )}
    </div>
  );
}

function StudentRow({ student: s }: { student: ListedStudent }) {
  const status = STATUS_MAP[s.status] ?? STATUS_MAP['aktif'];
  const isPasif = s.status === 'pasif';
  const tp = trackPill(s.track);
  const lastMeeting = s.last_meeting_at
    ? new Date(s.last_meeting_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : null;

  return (
    <Link
      href={`/ogrenciler/${s.id}`}
      className={`group flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm transition-all hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-md ${isPasif ? 'opacity-75' : ''}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${avatarColor(s.id)}`}>
        {initialsOf(s.full_name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[var(--ink)]">{s.full_name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
          {tp && <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
          {s.sinif_sube && <span>{s.sinif_sube}</span>}
          {lastMeeting && <span>· Son görüşme {lastMeeting}</span>}
        </div>
      </div>

      {s.is_intern_student && (
        <span className="hidden flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline-block">
          Stajyer{s.responsible_coach_other_name ? `: ${s.responsible_coach_other_name}` : ''}
        </span>
      )}
      <span className={`hidden flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-block ${status.className}`}>
        {status.label}
      </span>

      <IconChevronRight
        size={16}
        className="flex-shrink-0 text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}
