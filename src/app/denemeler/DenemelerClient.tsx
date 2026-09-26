'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  IconPlus, IconChartBar, IconEdit, IconTrash, IconChevronDown, IconChevronUp,
  IconArrowsRightLeft, IconX, IconSparkles, IconLoader2, IconUpload,
} from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS, type SubjectDef } from './examConstants';

const TYPE_BADGE: Record<string, string> = {
  TYT: 'bg-blue-50 text-blue-700',
  AYT: 'bg-purple-50 text-purple-700',
  LGS: 'bg-teal-50 text-teal-700',
};

const norm = (s: string) => (s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

function scoreColor(net: number, max: number) {
  const pct = (net / max) * 100;
  if (pct >= 70) return { text: 'text-emerald-700' };
  if (pct >= 45) return { text: 'text-amber-700' };
  return { text: 'text-red-600' };
}

function getSubjectNet(result: any, examType: string): number {
  if (!result) return 0;
  const d = Number(result.dogru) || 0;
  const y = Number(result.yanlis) || 0;
  return examType === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y);
}

function subjectsFor(examType: string): SubjectDef[] {
  return examType === 'TYT' ? TYT_SUBJECTS : examType === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
}

type SortKey = string; // 'name' | 'net' | 'puan' | 'puan_say' | 'puan_ea' | 'puan_soz' | `subj:<key>:net|dogru|yanlis`

function sortValue(e: any, key: SortKey): number | string {
  if (key === 'name') return e.students?.full_name ?? '';
  if (key === 'net') return e.net_score ?? 0;
  if (key === 'puan') return e.tyt_puan ?? e.lgs_puan ?? 0;
  if (key === 'puan_say') return e.say_puan ?? 0;
  if (key === 'puan_ea') return e.ea_puan ?? 0;
  if (key === 'puan_soz') return e.soz_puan ?? 0;
  if (key.startsWith('subj:')) {
    const [, subj, field] = key.split(':');
    const r = e.subject_results?.[subj];
    if (field === 'net') return getSubjectNet(r, e.exam_type);
    if (field === 'dogru') return Number(r?.dogru) || 0;
    if (field === 'yanlis') return Number(r?.yanlis) || 0;
  }
  return 0;
}

interface Props {
  initialExams: any[];
  students: any[];
  initialFilter?: string;
}

interface ExamGroup {
  key: string;
  examType: string;
  examName: string;
  date: string;
  rows: any[];
}

export function DenemelerClient({ initialExams, students, initialFilter }: Props) {
  const supabase = createClient();
  const { matchesFilter } = useExamFilter();

  const [exams, setExams] = useState<any[]>(initialExams);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TYT' | 'AYT' | 'LGS'>('ALL');
  const [sinifFilter, setSinifFilter] = useState('');
  const [denemeFilter, setDenemeFilter] = useState(''); // `${type}|${normName}`
  const [studentIds, setStudentIds] = useState<Set<string>>(
    () => new Set(initialFilter ? [initialFilter] : [])
  );
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const [groupSort, setGroupSort] = useState<Record<string, { key: SortKey; dir: 'asc' | 'desc' }>>({});

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const MAX_COMPARE = 5;

  // ── Filtre zinciri: tür → sınıf → deneme adı → öğrenci ──
  const afterTopbar = useMemo(() => exams.filter((e) => matchesFilter(e.students)), [exams, matchesFilter]);
  const afterType = useMemo(
    () => (typeFilter === 'ALL' ? afterTopbar : afterTopbar.filter((e) => e.exam_type === typeFilter)),
    [afterTopbar, typeFilter]
  );

  const candidateStudents = useMemo(
    () => students.filter((s: any) => matchesFilter(s) && (!sinifFilter || s.sinif_sube === sinifFilter)),
    [students, matchesFilter, sinifFilter]
  );

  const afterSinif = useMemo(
    () => (sinifFilter ? afterType.filter((e) => e.students?.sinif_sube === sinifFilter) : afterType),
    [afterType, sinifFilter]
  );

  // Deneme adı seçenekleri (öğrenci filtresinden bağımsız, tür+sınıfa göre)
  const denemeOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; date: string }>();
    afterSinif.forEach((e) => {
      const key = `${e.exam_type}|${norm(e.exam_name)}`;
      const existing = map.get(key);
      if (!existing || e.exam_date > existing.date) {
        map.set(key, { key, label: `${e.exam_name} (${e.exam_type})`, date: e.exam_date });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [afterSinif]);

  const afterDeneme = useMemo(
    () => (denemeFilter ? afterSinif.filter((e) => `${e.exam_type}|${norm(e.exam_name)}` === denemeFilter) : afterSinif),
    [afterSinif, denemeFilter]
  );

  const afterStudents = useMemo(
    () => (studentIds.size > 0 ? afterDeneme.filter((e) => studentIds.has(e.student_id)) : afterDeneme),
    [afterDeneme, studentIds]
  );

  const availableSiniflar = useMemo(
    () =>
      Array.from(
        new Set(students.filter((s: any) => matchesFilter(s)).map((s: any) => s.sinif_sube).filter(Boolean))
      ).sort(),
    [students, matchesFilter]
  );

  // ── Gruplama: aynı deneme adı + sınav türü tek grup ──
  const groups: ExamGroup[] = useMemo(() => {
    const map = new Map<string, ExamGroup>();
    afterStudents.forEach((e) => {
      const key = `${e.exam_type}|${norm(e.exam_name)}`;
      if (!map.has(key)) {
        map.set(key, { key, examType: e.exam_type, examName: e.exam_name, date: e.exam_date, rows: [] });
      }
      const g = map.get(key)!;
      g.rows.push(e);
      if (e.exam_date > g.date) g.date = e.exam_date;
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [afterStudents]);

  function isGroupOpen(key: string, index: number) {
    if (key in manualOpen) return manualOpen[key];
    return index === 0; // en güncel deneme varsayılan açık
  }
  function toggleGroup(key: string, currentlyOpen: boolean) {
    setManualOpen((prev) => ({ ...prev, [key]: !currentlyOpen }));
  }

  function getSort(key: string): { key: SortKey; dir: 'asc' | 'desc' } {
    return groupSort[key] ?? { key: 'name', dir: 'asc' };
  }
  function setSort(key: string, sortKey: SortKey) {
    setGroupSort((prev) => ({ ...prev, [key]: { key: sortKey, dir: prev[key]?.dir ?? 'asc' } }));
  }
  function toggleDir(key: string) {
    setGroupSort((prev) => ({
      ...prev,
      [key]: { key: prev[key]?.key ?? 'name', dir: (prev[key]?.dir ?? 'asc') === 'asc' ? 'desc' : 'asc' },
    }));
  }

  function toggleCompareSelect(id: string) {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }
  function exitCompareMode() {
    setCompareMode(false);
    setSelectedCompareIds([]);
  }
  const compareExams = exams.filter((e) => selectedCompareIds.includes(e.id));

  async function handleToggleAnalysis(exam: any) {
    setTogglingId(exam.id);
    const newValue = !exam.analysis_done;
    const { error } = await (supabase.from('exams') as any).update({ analysis_done: newValue }).eq('id', exam.id);
    if (!error) setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, analysis_done: newValue } : e)));
    setTogglingId(null);
  }
  async function handleDelete(id: string) {
    await (supabase.from('exams') as any).delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  function toggleStudent(id: string) {
    setStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalCount = afterStudents.length;
  const filtersActive = typeFilter !== 'ALL' || !!sinifFilter || !!denemeFilter || studentIds.size > 0;

  return (
    <div className={`mx-auto max-w-6xl ${compareMode && selectedCompareIds.length > 0 ? 'pb-20' : ''}`}>
      {/* Başlık */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Deneme sonuçları</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{totalCount} kayıt · {groups.length} deneme</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${
              compareMode ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <IconArrowsRightLeft size={15} />
            {compareMode ? 'İptal' : 'Karşılaştır'}
          </button>
          <Link href="/denemeler/toplu-yukle" className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
            <IconUpload size={15} />
            Toplu Yükle
          </Link>
          <Link href="/denemeler/yeni" className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100">
            <IconPlus size={15} />
            Deneme gir
          </Link>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['ALL', 'TYT', 'AYT', 'LGS'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setDenemeFilter(''); }}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ALL' ? 'Hepsi' : t}
            </button>
          ))}
        </div>

        {availableSiniflar.length > 0 && (
          <select
            value={sinifFilter}
            onChange={(e) => { setSinifFilter(e.target.value); setDenemeFilter(''); }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-700"
          >
            <option value="">Tüm sınıflar</option>
            {availableSiniflar.map((s: any) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          value={denemeFilter}
          onChange={(e) => setDenemeFilter(e.target.value)}
          className="min-w-[170px] rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-700"
        >
          <option value="">Tüm denemeler</option>
          {denemeOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStudentPicker((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
          >
            {studentIds.size === 0 ? 'Tüm öğrenciler' : `${studentIds.size} öğrenci seçili`}
            <IconChevronDown size={13} />
          </button>
          {showStudentPicker && (
            <div className="absolute left-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              <div className="mb-1 flex justify-between px-1 text-[11px]">
                <button onClick={() => setStudentIds(new Set(candidateStudents.map((s: any) => s.id)))} className="text-blue-600 hover:underline">
                  Tümünü seç
                </button>
                <button onClick={() => setStudentIds(new Set())} className="text-gray-400 hover:underline">Temizle</button>
              </div>
              {candidateStudents.length === 0 && <p className="px-1.5 py-1 text-[12px] text-gray-400">Öğrenci yok.</p>}
              {candidateStudents.map((s: any) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-gray-50">
                  <input type="checkbox" checked={studentIds.has(s.id)} onChange={() => toggleStudent(s.id)} className="h-3.5 w-3.5 accent-blue-600" />
                  {s.full_name}
                </label>
              ))}
            </div>
          )}
        </div>

        {filtersActive && (
          <button
            onClick={() => { setTypeFilter('ALL'); setSinifFilter(''); setDenemeFilter(''); setStudentIds(new Set()); }}
            className="text-[12px] text-gray-400 underline hover:text-gray-600"
          >
            Filtreleri temizle
          </button>
        )}
      </div>

      {/* Gruplar */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-20">
          <IconChartBar size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">Bu filtrelerle eşleşen deneme bulunamadı.</p>
          <Link href="/denemeler/yeni" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Deneme gir
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => (
            <ExamGroupCard
              key={g.key}
              group={g}
              isOpen={isGroupOpen(g.key, idx)}
              onToggle={() => toggleGroup(g.key, isGroupOpen(g.key, idx))}
              sort={getSort(g.key)}
              onSortChange={(k) => setSort(g.key, k)}
              onDirToggle={() => toggleDir(g.key)}
              compareMode={compareMode}
              selectedCompareIds={selectedCompareIds}
              onToggleCompare={toggleCompareSelect}
              compareDisabled={selectedCompareIds.length >= MAX_COMPARE}
              onToggleAnalysis={handleToggleAnalysis}
              togglingId={togglingId}
              onDeleteRequest={setDeletingId}
            />
          ))}
        </div>
      )}

      {/* Karşılaştırma alt çubuğu */}
      {compareMode && selectedCompareIds.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
            <span className="text-[13px] text-gray-600">{selectedCompareIds.length} deneme seçildi</span>
            <button
              onClick={() => setShowCompare(true)}
              disabled={selectedCompareIds.length < 2}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Karşılaştır
            </button>
            <button onClick={exitCompareMode} className="text-[12px] text-gray-400 hover:text-gray-600">Vazgeç</button>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Denemeyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">Bu deneme kaydı kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Vazgeç
              </button>
              <button onClick={() => handleDelete(deletingId)} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Karşılaştırma modalı */}
      {showCompare && compareExams.length >= 2 && (
        <ExamCompareModal exams={compareExams} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

// ─── Deneme grubu kartı: akordeon başlık + Excel tarzı tablo ──

function ExamGroupCard({
  group, isOpen, onToggle, sort, onSortChange, onDirToggle,
  compareMode, selectedCompareIds, onToggleCompare, compareDisabled,
  onToggleAnalysis, togglingId, onDeleteRequest,
}: {
  group: ExamGroup;
  isOpen: boolean;
  onToggle: () => void;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onSortChange: (k: SortKey) => void;
  onDirToggle: () => void;
  compareMode: boolean;
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
  compareDisabled: boolean;
  onToggleAnalysis: (exam: any) => void;
  togglingId: string | null;
  onDeleteRequest: (id: string) => void;
}) {
  const subjects = subjectsFor(group.examType);
  const maxScore = group.examType === 'TYT' ? 120 : group.examType === 'AYT' ? 160 : 90;
  const typeBadge = TYPE_BADGE[group.examType] ?? 'bg-gray-100 text-gray-500';

  const sortedRows = useMemo(() => {
    const rows = [...group.rows];
    rows.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp = typeof va === 'string' || typeof vb === 'string'
        ? String(va).localeCompare(String(vb), 'tr')
        : (va as number) - (vb as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [group.rows, sort]);

  const avgNet = Math.round((group.rows.reduce((s, e) => s + (e.net_score || 0), 0) / group.rows.length) * 100) / 100;
  const dateLabel = new Date(group.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const stickyNameLeft = compareMode ? 'left-8' : 'left-0';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeBadge}`}>{group.examType}</span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-gray-900">{group.examName}</div>
            <div className="text-[11px] text-gray-400">{dateLabel} · {group.rows.length} öğrenci · Ort. net {avgNet}</div>
          </div>
        </div>
        {isOpen ? <IconChevronUp size={16} className="flex-shrink-0 text-gray-400" /> : <IconChevronDown size={16} className="flex-shrink-0 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Sıralama */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50/60 px-4 py-2.5">
            <span className="text-[11px] text-gray-400">Sırala:</span>
            <select
              value={sort.key}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
            >
              <option value="name">İsim</option>
              <option value="net">Toplam Net</option>
              {group.examType === 'AYT' ? (
                <>
                  <option value="puan_say">Sayısal Puanı</option>
                  <option value="puan_ea">EA Puanı</option>
                  <option value="puan_soz">Sözel Puanı</option>
                </>
              ) : (
                <option value="puan">Puan</option>
              )}
              {subjects.map((s) => (
                <optgroup key={s.key} label={s.label}>
                  <option value={`subj:${s.key}:net`}>{s.label} Net</option>
                  <option value={`subj:${s.key}:dogru`}>{s.label} Doğru</option>
                  <option value={`subj:${s.key}:yanlis`}>{s.label} Yanlış</option>
                </optgroup>
              ))}
            </select>
            <button onClick={onDirToggle} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
              {sort.dir === 'asc' ? '↑ Artan' : '↓ Azalan'}
            </button>
          </div>

          {/* Excel tarzı tablo */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {compareMode && (
                    <th rowSpan={2} className="sticky left-0 z-20 w-8 bg-gray-50 px-2 py-2" />
                  )}
                  <th rowSpan={2} className={`sticky ${stickyNameLeft} z-20 min-w-[140px] bg-gray-50 px-3 py-2 text-left font-medium text-gray-500`}>
                    Öğrenci
                  </th>
                  {subjects.map((s) => (
                    <th key={s.key} colSpan={4} className="border-l border-gray-200 px-2 py-1 text-center font-medium text-gray-500">
                      {s.label}
                    </th>
                  ))}
                  <th rowSpan={2} className="border-l border-gray-200 px-2 py-2 text-center font-semibold text-gray-700">
                    Toplam<br />Net
                  </th>
                  {group.examType === 'AYT' ? (
                    <>
                      <th rowSpan={2} className="border-l border-gray-200 px-2 py-2 text-center font-medium text-gray-500">SAY<br />Puan</th>
                      <th rowSpan={2} className="px-2 py-2 text-center font-medium text-gray-500">EA<br />Puan</th>
                      <th rowSpan={2} className="px-2 py-2 text-center font-medium text-gray-500">SÖZ<br />Puan</th>
                    </>
                  ) : (
                    <th rowSpan={2} className="border-l border-gray-200 px-2 py-2 text-center font-medium text-gray-500">Puan</th>
                  )}
                  <th rowSpan={2} className="border-l border-gray-200 px-2 py-2 text-center font-medium text-gray-500">Analiz</th>
                  <th rowSpan={2} className="px-2 py-2 text-center font-medium text-gray-500">İşlem</th>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {subjects.map((s) => (
                    <Fragment key={s.key}>
                      <th className="border-l border-gray-100 px-1.5 py-1 text-center font-normal text-gray-400">D</th>
                      <th className="px-1.5 py-1 text-center font-normal text-gray-400">Y</th>
                      <th className="px-1.5 py-1 text-center font-normal text-gray-400">B</th>
                      <th className="px-1.5 py-1 text-center font-normal text-gray-400">N</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRows.map((e) => {
                  const colors = scoreColor(e.net_score, maxScore);
                  const isToggling = togglingId === e.id;
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      {compareMode && (
                        <td className="sticky left-0 z-10 w-8 bg-white px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCompareIds.includes(e.id)}
                            onChange={() => onToggleCompare(e.id)}
                            disabled={!selectedCompareIds.includes(e.id) && compareDisabled}
                            className="h-3.5 w-3.5 accent-blue-600 disabled:opacity-30"
                          />
                        </td>
                      )}
                      <td className={`sticky ${stickyNameLeft} z-10 whitespace-nowrap bg-white px-3 py-2 font-medium text-gray-800`}>
                        {e.students?.full_name}
                      </td>
                      {subjects.map((s) => {
                        const r = e.subject_results?.[s.key];
                        const hasData = !!r;
                        const d = Number(r?.dogru) || 0;
                        const y = Number(r?.yanlis) || 0;
                        const bos = Math.max(0, s.total - d - y);
                        const net = getSubjectNet(r, e.exam_type);
                        return (
                          <Fragment key={s.key}>
                            <td className="border-l border-gray-100 px-1.5 py-2 text-center text-gray-600">{hasData ? d : '—'}</td>
                            <td className="px-1.5 py-2 text-center text-gray-600">{hasData ? y : '—'}</td>
                            <td className="px-1.5 py-2 text-center text-gray-400">{hasData ? bos : '—'}</td>
                            <td className="px-1.5 py-2 text-center font-semibold text-gray-800">{hasData ? net : '—'}</td>
                          </Fragment>
                        );
                      })}
                      <td className={`border-l border-gray-100 px-2 py-2 text-center font-bold ${colors.text}`}>{e.net_score}</td>
                      {group.examType === 'AYT' ? (
                        <>
                          <td className="border-l border-gray-100 px-2 py-2 text-center text-gray-600">{e.say_puan ?? '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{e.ea_puan ?? '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{e.soz_puan ?? '—'}</td>
                        </>
                      ) : (
                        <td className="border-l border-gray-100 px-2 py-2 text-center text-gray-600">
                          {(group.examType === 'TYT' ? e.tyt_puan : e.lgs_puan) ?? '—'}
                        </td>
                      )}
                      <td className="border-l border-gray-100 px-2 py-2 text-center">
                        <button
                          onClick={() => onToggleAnalysis(e)}
                          disabled={isToggling}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70 disabled:opacity-40 ${
                            e.analysis_done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {isToggling ? '...' : e.analysis_done ? '✓' : '—'}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/denemeler/${e.id}/duzenle`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                            <IconEdit size={14} />
                          </Link>
                          <button onClick={() => onDeleteRequest(e.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Yapay zeka analiz sonucu tipleri (değişmedi) ──────────────

interface StudentAnalysis {
  student_name: string;
  guclu_dersler: string[];
  zayif_dersler: string[];
  trend: string;
  capraz_degerlendirme: string | null;
  oneriler: string[];
}

interface ExamAnalysisResult {
  ogrenciler: StudentAnalysis[];
  karsilastirma: string | null;
}

// ─── Karşılaştırma modalı (değişmedi) ──────────────────────────

function ExamCompareModal({ exams, onClose }: { exams: any[]; onClose: () => void }) {
  const subjectRows = useMemo(() => {
    const map = new Map<string, string>();
    exams.forEach((e) => {
      const subjects = e.exam_type === 'TYT' ? TYT_SUBJECTS : e.exam_type === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
      subjects.forEach((s) => { if (!map.has(s.key)) map.set(s.key, s.label); });
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [exams]);

  const maxNet = Math.max(...exams.map((e) => e.net_score), 1);

  const [includeMeetings, setIncludeMeetings] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ExamAnalysisResult | null>(null);

  const studentCount = useMemo(
    () => new Set(exams.map((e) => e.student_id)).size,
    [exams]
  );

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/analiz/deneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examIds: exams.map((e) => e.id),
          includeMeetings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analiz başarısız oldu.');
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message ?? 'Bir hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Deneme Karşılaştırma</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        <div className="mb-6 space-y-2.5">
          {exams.map((e) => {
            const pct = Math.round((e.net_score / maxNet) * 100);
            const colors = scoreColor(e.net_score, e.max_score);
            return (
              <div key={e.id}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="truncate font-medium text-gray-700">
                    {e.students?.full_name} — {e.exam_name}
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                      {new Date(e.exam_date).toLocaleDateString('tr-TR')}
                    </span>
                  </span>
                  <span className={`flex-shrink-0 font-semibold ${colors.text}`}>{e.net_score} net</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500">Ders</th>
                {exams.map((e) => (
                  <th key={e.id} className="min-w-[120px] px-3 py-2 text-center font-medium text-gray-500">
                    <div className="truncate">{e.students?.full_name}</div>
                    <div className="text-[10px] font-normal text-gray-400">{e.exam_name} · {e.exam_type}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="bg-blue-50/50 font-semibold">
                <td className="sticky left-0 z-10 bg-blue-50/50 px-3 py-2 text-gray-700">Toplam Net</td>
                {exams.map((e) => (
                  <td key={e.id} className="px-3 py-2 text-center text-blue-700">{e.net_score}</td>
                ))}
              </tr>
              {subjectRows.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-gray-600">{row.label}</td>
                  {exams.map((e) => {
                    const r = e.subject_results?.[row.key];
                    if (!r) return <td key={e.id} className="px-3 py-2 text-center text-gray-300">—</td>;
                    const net = getSubjectNet(r, e.exam_type);
                    const d = Number(r.dogru) || 0;
                    const y = Number(r.yanlis) || 0;
                    return (
                      <td key={e.id} className="px-3 py-2 text-center">
                        <div className="font-medium text-gray-800">{net}</div>
                        <div className="text-[10px] text-gray-400">{d}D · {y}Y</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-4">
          {!analysisResult && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-blue-600" />
                  <span className="text-[13px] font-medium text-gray-800">Yapay zeka ile analiz et</span>
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeMeetings}
                    onChange={(ev) => setIncludeMeetings(ev.target.checked)}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  Görüşme notlarını da dahil et
                </label>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {studentCount > 1
                  ? `${studentCount} farklı öğrencinin denemeleri ayrı ayrı analiz edilip aralarında kıyaslama yapılacak.`
                  : 'Güçlü/zayıf dersler, trend ve öneriler oluşturulacak.'}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <IconLoader2 size={15} className="animate-spin" />
                    Analiz ediliyor...
                  </>
                ) : (
                  <>
                    <IconSparkles size={15} />
                    Yapay Zeka ile Analiz Et
                  </>
                )}
              </button>
              {analysisError && <p className="mt-2 text-[12px] text-red-600">{analysisError}</p>}
            </>
          )}

          {analysisResult && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-blue-600" />
                  <span className="text-[13px] font-medium text-gray-800">Yapay Zeka Analizi</span>
                </div>
                <button onClick={() => setAnalysisResult(null)} className="text-[11px] text-gray-400 hover:text-gray-600">
                  Temizle
                </button>
              </div>

              <div className="space-y-3">
                {analysisResult.ogrenciler.map((o, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-white p-3.5">
                    <div className="mb-2 text-[13px] font-semibold text-gray-900">{o.student_name}</div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {o.guclu_dersler.map((d) => (
                        <span key={d} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">+ {d}</span>
                      ))}
                      {o.zayif_dersler.map((d) => (
                        <span key={d} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">− {d}</span>
                      ))}
                    </div>

                    <p className="text-[12px] text-gray-600">
                      <span className="font-medium text-gray-700">Trend: </span>
                      {o.trend}
                    </p>

                    {o.capraz_degerlendirme && (
                      <p className="mt-1.5 text-[12px] text-gray-600">
                        <span className="font-medium text-gray-700">Görüşme değerlendirmesi: </span>
                        {o.capraz_degerlendirme}
                      </p>
                    )}

                    {o.oneriler.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[12px] font-medium text-gray-700">Öneriler:</span>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {o.oneriler.map((oneri, oi) => (
                            <li key={oi} className="text-[12px] text-gray-600">{oneri}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {analysisResult.karsilastirma && (
                  <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3.5">
                    <div className="mb-1.5 text-[12px] font-semibold text-purple-800">Öğrenciler Arası Kıyaslama</div>
                    <p className="text-[12px] text-purple-900">{analysisResult.karsilastirma}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}