'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Student } from '@/types/database';
import { IconArchive, IconPlus, IconUsers, IconX } from '@tabler/icons-react';
import { PageHero } from '@/components/ui/PageHero';
import {
  ListToolbar, matchesQuery, toolbarSelectCls, daysSinceMeeting,
} from '@/components/StudentCard';
import type { StudentSummary } from '@/lib/student-summary';
import { avatarColor, initials, trackPill } from '@/lib/ui-colors';
import { IconChevronRight } from '@tabler/icons-react';


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
  summary?: StudentSummary | null;
};

// Satır özeti: son görüşme, son deneme neti (bir öncekine göre), bu haftaki program uyumu
function SummaryChips({ s }: { s: ListedStudent }) {
  const sum = s.summary;
  const d = daysSinceMeeting(s.last_meeting_at);
  const meetCls = d === null || d > 14 ? 'text-rose-600' : d > 7 ? 'text-amber-600' : 'text-emerald-700';
  const meetText = d === null ? 'Görüşme yok' : d === 0 ? 'Bugün görüşüldü' : `${d} gün önce`;
  const pct = sum && sum.weekPlanned > 0 ? Math.round((sum.weekDone / sum.weekPlanned) * 100) : null;
  const pctCls = pct === null ? 'text-[var(--ink-muted)]' : pct >= 70 ? 'text-emerald-700' : pct >= 40 ? 'text-amber-600' : 'text-rose-600';
  const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px]">
      <span className={`font-semibold ${meetCls}`} title="Son öğrenci görüşmesi">{meetText}</span>
      {sum?.lastNet !== null && sum?.lastNet !== undefined && (
        <span className="text-[var(--ink)]" title={sum.examDate ? `Son deneme: ${new Date(`${sum.examDate}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` : 'Son deneme'}>
          {sum.examType ? `${sum.examType} ` : ''}<b>{fmt(sum.lastNet)}</b> net
          {sum.netDiff !== null && sum.netDiff !== 0 && (
            <span className={`ml-0.5 font-semibold ${sum.netDiff > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{sum.netDiff > 0 ? '▲' : '▼'}{fmt(Math.abs(sum.netDiff))}</span>
          )}
        </span>
      )}
      <span className={pctCls} title={sum && sum.weekPlanned ? `Bu hafta ${sum.weekDone}/${sum.weekPlanned} görev yapıldı` : 'Bu hafta programda görev yok'}>
        {pct === null ? 'Program yok' : <>Program <b>%{pct}</b></>}
      </span>
    </span>
  );
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ad', label: 'Ada göre (A-Z)' },
  { value: 'soyad', label: 'Soyada göre (A-Z)' },
  { value: 'sinif', label: 'Sınıfa göre' },
  { value: 'dogum', label: 'Doğum tarihine göre' },
  { value: 'gorusme_yeni', label: 'Son görüşme (yeniden eskiye)' },
  { value: 'gorusme_eski', label: 'Son görüşme (eskiden yeniye)' },
];

type AccResult = {
  id: string; name: string; status: 'olusturuldu' | 'baglandi' | 'atlandi';
  reason?: string; username?: string; password?: string;
};

function getSoyad(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

// staffMode: kurum personeli (öğrenci ekleme, hesap açma ve arşiv düğmeleri kapalı)
export function OgrencilerClient({ students, archiveMode, staffMode = false }: { students: ListedStudent[]; archiveMode: boolean; staffMode?: boolean }) {
  const [accBusy, setAccBusy] = useState(false);
  const [accMsg, setAccMsg] = useState<string | null>(null);
  const [accResults, setAccResults] = useState<AccResult[] | null>(null);
  const [accFilter, setAccFilter] = useState<'' | 'var' | 'yok'>('');
  const router = useRouter();

  // Hesabı olan öğrencinin şifresini ilk şifreye döndürür (öğrenci unuttuysa)
  async function resetPassword(r: AccResult) {
    if (!window.confirm(`${r.name} adlı öğrencinin şifresi ilk şifreye (telefonun son 4 hanesi + doğum yılı) döndürülsün mü?`)) return;
    const res = await fetch('/api/ogrenci/hesap-olustur', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: r.id, reset: true }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { window.alert(json.error ?? 'Şifre sıfırlanamadı.'); return; }
    setAccResults((cur) => cur?.map((x) => x.id === r.id
      ? { ...x, password: json.password, reason: 'Şifre ilk şifreye döndürüldü; ilk girişte değiştirmesi istenecek' }
      : x) ?? null);
  }

  // Henüz giriş hesabı olmayan öğrenciler için hesap oluşturur (telefon + doğum tarihi gerekir).
  async function createStudentAccounts() {
    if (!window.confirm('Giriş hesabı olmayan öğrencilerin hesapları oluşturulsun mu?\nKullanıcı adı: telefon · İlk şifre: telefonun son 4 hanesi + doğum yılı')) return;
    setAccBusy(true);
    setAccMsg(null);
    setAccResults(null);
    try {
      const res = await fetch('/api/ogrenci/hesap-olustur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (!res.ok) { setAccMsg(json.error ?? 'Hesaplar oluşturulamadı.'); return; }
      const results: AccResult[] = json.results ?? [];
      if (!results.length) setAccMsg('Hesabı olmayan öğrenciniz yok; herkesin hesabı açık.');
      setAccResults(results);
      if (results.some((r) => r.status !== 'atlandi')) router.refresh(); // listedeki hesap durumu güncellensin
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
    const list = examFiltered.filter((s) =>
      (!sinifFilter || s.sinif_sube === sinifFilter)
      && (!accFilter || (accFilter === 'var') === !!s.profile_id)
      && matchesQuery(s.full_name, query));

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
  }, [examFiltered, sinifFilter, accFilter, query, sortKey]);

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
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#1B4A8A] to-[#2A5CA8] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
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
      {accResults && accResults.length > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-[13px] text-[var(--ink)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold">
              {accResults.filter((r) => r.status === 'olusturuldu').length} hesap oluşturuldu
              {accResults.some((r) => r.status === 'baglandi') && `, ${accResults.filter((r) => r.status === 'baglandi').length} mevcut hesaba bağlandı`}
              {accResults.some((r) => r.status === 'atlandi') && `, ${accResults.filter((r) => r.status === 'atlandi').length} atlandı`}
            </span>
            <button type="button" onClick={() => setAccResults(null)} className="text-gray-400 hover:text-gray-600" aria-label="Kapat"><IconX size={16} /></button>
          </div>
          <p className="mb-2 text-[12px] text-[var(--ink-muted)]">Giriş adresi: kocdefterim.com.tr/giris/ogrenci · Bu bilgileri öğrencilere iletin.</p>
          <ul className="space-y-1.5">
            {accResults.map((r) => (
              <li key={r.id} className={`rounded-lg px-3 py-2 ${r.status === 'olusturuldu' ? 'bg-emerald-50' : r.status === 'baglandi' ? 'bg-sky-50' : 'bg-amber-50'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/ogrenciler/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>
                  <span className={`text-[11.5px] font-semibold ${r.status === 'olusturuldu' ? 'text-emerald-700' : r.status === 'baglandi' ? 'text-sky-700' : 'text-amber-700'}`}>
                    {r.status === 'olusturuldu' ? 'hesap açıldı' : r.status === 'baglandi' ? 'mevcut hesaba bağlandı' : 'atlandı'}
                  </span>
                  {r.username && <span className="text-[12px]">Kullanıcı adı: <b>{r.username}</b></span>}
                  {r.password && <span className="text-[12px]">İlk şifre: <b>{r.password}</b></span>}
                  {r.status === 'baglandi' && !r.password && (
                    <button type="button" onClick={() => resetPassword(r)} className="rounded-md border border-sky-200 bg-white px-2 py-0.5 text-[11.5px] font-medium text-sky-700 hover:bg-sky-100">
                      İlk şifreye sıfırla
                    </button>
                  )}
                </div>
                {r.reason && <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{r.reason}</div>}
              </li>
            ))}
          </ul>
        </div>
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
        {!staffMode && (
          <select value={accFilter} onChange={(e) => setAccFilter(e.target.value as '' | 'var' | 'yok')} className={toolbarSelectCls}>
            <option value="">Hesap: tümü</option>
            <option value="var">Hesabı açık olanlar</option>
            <option value="yok">Hesabı olmayanlar</option>
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
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="hidden grid-cols-[minmax(0,2fr)_80px_minmax(0,1.2fr)_minmax(0,2fr)_90px_24px] gap-3 border-b border-[var(--border)] bg-[var(--paper)] px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-muted)] md:grid">
            <span>Öğrenci</span><span>Sınıf</span><span>Kurum</span><span>Özet</span><span>{staffMode ? 'Durum' : 'Hesap'}</span><span />
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((s) => {
              const tp = trackPill(s.track);
              const st = s.status && s.status !== 'aktif' ? STATUS_MAP[s.status] ?? null : null;
              return (
                <li key={s.id}>
                  <Link href={`/ogrenciler/${s.id}`}
                    className={`group grid grid-cols-[minmax(0,1fr)_20px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--accent-soft)]/50 md:grid-cols-[minmax(0,2fr)_80px_minmax(0,1.2fr)_minmax(0,2fr)_90px_24px] ${s.status === 'pasif' ? 'opacity-70' : ''}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${avatarColor(s.id)}`}>{initials(s.full_name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{s.full_name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
                          {tp && <span className={`rounded-md px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
                          <span className="md:hidden">{[s.sinif_sube, s.kurum].filter(Boolean).join(' · ')}</span>
                          {s.is_intern_student && (
                            <span className="rounded-full bg-amber-100 px-2 py-px text-[10.5px] font-medium text-amber-700">
                              Stajyer{s.responsible_coach_other_name ? `: ${s.responsible_coach_other_name}` : ''}
                            </span>
                          )}
                          {st && <span className={`rounded-full px-2 py-px text-[10.5px] font-medium md:hidden ${st.className}`}>{st.label}</span>}
                        </span>
                        {s.summary && <span className="mt-1 block md:hidden"><SummaryChips s={s} /></span>}
                      </span>
                    </span>
                    <span className="hidden truncate text-[13px] text-[var(--ink)] md:block">{s.sinif_sube || '–'}</span>
                    <span className="hidden truncate text-[13px] text-[var(--ink-muted)] md:block">{s.kurum || '–'}</span>
                    <span className="hidden min-w-0 md:block">{s.summary ? <SummaryChips s={s} /> : <span className="text-[12px] text-[var(--ink-muted)]">–</span>}</span>
                    <span className="hidden md:block">
                      {st ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${st.className}`}>{st.label}</span>
                      ) : staffMode ? (
                        <span className="text-[12.5px] text-[var(--ink-muted)]">Aktif</span>
                      ) : s.profile_id ? (
                        <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--success)]">Açık</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11.5px] font-medium text-gray-500">Yok</span>
                      )}
                    </span>
                    <IconChevronRight size={17} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
