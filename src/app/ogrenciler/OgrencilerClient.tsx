'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Student } from '@/types/database';
import { IconArchive, IconPlus, IconUsers } from '@tabler/icons-react';
import { PageHero } from '@/components/ui/PageHero';
import {
  StudentCard, StudentGrid, ListToolbar, matchesQuery, toolbarSelectCls,
} from '@/components/StudentCard';


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

// staffMode: kurum personeli (öğrenci ekleme, hesap açma ve arşiv düğmeleri kapalı)
export function OgrencilerClient({ students, archiveMode, staffMode = false }: { students: ListedStudent[]; archiveMode: boolean; staffMode?: boolean }) {
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
  const [query, setQuery] = useState('');

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
    const list = examFiltered.filter((s) => (!sinifFilter || s.sinif_sube === sinifFilter) && matchesQuery(s.full_name, query));

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
  }, [examFiltered, sinifFilter, query, sortKey]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        theme="sky"
        icon={<IconUsers size={22} />}
        title={archiveMode ? 'Arşivdeki öğrenciler' : 'Öğrenciler'}
        subtitle={archiveMode ? `${examFiltered.length} arşivde öğrenci` : `${examFiltered.length} aktif öğrenci`}
        actions={archiveMode ? (
          <Link
            href="/ogrenciler"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
          >
            Öğrencilere dön
          </Link>
        ) : staffMode ? null : (
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

      <ListToolbar query={query} onQuery={setQuery}>
        {availableSiniflar.length > 0 && (
          <select value={sinifFilter} onChange={(e) => setSinifFilter(e.target.value)} className={toolbarSelectCls}>
            <option value="">Tüm sınıflar</option>
            {availableSiniflar.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={toolbarSelectCls}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </ListToolbar>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <IconUsers size={32} className="text-gray-300" />
          <p className="text-[13px] text-[var(--ink-muted)]">
            {archiveMode && !query ? 'Arşivde öğrenci yok.' : 'Bu filtrede öğrenci yok.'}
          </p>
        </div>
      ) : (
        <StudentGrid>
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} href={`/ogrenciler/${s.id}`} showMeeting={false}
              statusLabel={s.status && s.status !== 'aktif' ? STATUS_MAP[s.status] ?? null : null} />
          ))}
        </StudentGrid>
      )}
    </div>
  );
}
