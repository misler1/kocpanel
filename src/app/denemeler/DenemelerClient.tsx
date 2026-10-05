'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  IconPlus, IconChartBar, IconEdit, IconTrash, IconChevronDown, IconChevronUp,
  IconArrowsRightLeft, IconX, IconSparkles, IconLoader2, IconUpload, IconPrinter,
  IconArrowUp, IconArrowDown, IconEqual, IconCheck,
} from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS, type SubjectDef } from './examConstants';


const TYPE_BADGE: Record<string, string> = {
  TYT: 'bg-blue-50 text-blue-700',
  AYT: 'bg-purple-50 text-purple-700',
  LGS: 'bg-teal-50 text-teal-700',
};

// ─── Ders renk paleti: her ders sıraya göre sabit bir renk alır ──
const SUBJECT_PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
];
function subjectColor(index: number) {
  return SUBJECT_PALETTE[index % SUBJECT_PALETTE.length];
}

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

// Bir önceki değere göre yükseldi / düştü / aynı kaldı okunu döndürür.
// Yükseliş: yeşil yukarı ok · Düşüş: kırmızı aşağı ok · Aynı: açık mor eşittir
function TrendIcon({ current, previous }: { current: number; previous: number | null | undefined }) {
  if (previous === null || previous === undefined) return null;
  if (current > previous) return <IconArrowUp size={13} stroke={2.5} className="text-emerald-500" />;
  if (current < previous) return <IconArrowDown size={13} stroke={2.5} className="text-red-500" />;
  return <IconEqual size={13} stroke={2.5} className="text-purple-300" />;
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

// ─── Deneme grubu kartı: akordeon başlık + Excel tarzı tablo (ders renkli) ──

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

          {/* Excel tarzı tablo — her ders kendi rengiyle */}
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
                  {subjects.map((s, i) => {
                    const c = subjectColor(i);
                    return (
                      <th key={s.key} colSpan={4} className={`border-l px-2 py-1 text-center font-semibold ${c.border} ${c.bg} ${c.text}`}>
                        <span className="inline-flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                          {s.label}
                        </span>
                      </th>
                    );
                  })}
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
                  {subjects.map((s, i) => {
                    const c = subjectColor(i);
                    return (
                      <Fragment key={s.key}>
                        <th className={`border-l px-1.5 py-1 text-center font-normal ${c.border} ${c.bg}/40 text-gray-400`}>D</th>
                        <th className={`px-1.5 py-1 text-center font-normal ${c.bg}/40 text-gray-400`}>Y</th>
                        <th className={`px-1.5 py-1 text-center font-normal ${c.bg}/40 text-gray-400`}>B</th>
                        <th className={`px-1.5 py-1 text-center font-normal ${c.bg}/40 text-gray-400`}>N</th>
                      </Fragment>
                    );
                  })}
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
                      {subjects.map((s, i) => {
                        const c = subjectColor(i);
                        const r = e.subject_results?.[s.key];
                        const hasData = !!r;
                        const d = Number(r?.dogru) || 0;
                        const y = Number(r?.yanlis) || 0;
                        const bos = Math.max(0, s.total - d - y);
                        const net = getSubjectNet(r, e.exam_type);
                        return (
                          <Fragment key={s.key}>
                            <td className={`border-l px-1.5 py-2 text-center text-gray-600 ${c.border}`}>{hasData ? d : '—'}</td>
                            <td className="px-1.5 py-2 text-center text-gray-600">{hasData ? y : '—'}</td>
                            <td className="px-1.5 py-2 text-center text-gray-400">{hasData ? bos : '—'}</td>
                            <td className={`px-1.5 py-2 text-center font-semibold ${hasData ? c.text : 'text-gray-300'}`}>{hasData ? net : '—'}</td>
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

// ─── Tek bir denemenin ders ders D/Y/Net dökümü ──────────────────
// Bu bileşen, deneme sonuçları sayfasındaki formatla birebir aynı
// görünümü, karşılaştırma modalında VE öğrenci detay sayfasında
// kullanabilmek için ayrı bir bileşen olarak dışa aktarılmıştır.
// `previous` verilirse, her dersin netinin yanında bir önceki
// denemeye göre yükseliş/düşüş/eşitlik oku gösterilir.
export function ExamSubjectBreakdown({ exam, previous }: { exam: any; previous?: any }) {
  const subjects = subjectsFor(exam.exam_type);
  const typeBadge = TYPE_BADGE[exam.exam_type] ?? 'bg-gray-100 text-gray-500';
  const dateLabel = new Date(exam.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-gray-900">{exam.exam_name}</div>
          <div className="text-[11px] text-gray-400">{dateLabel} · {exam.students?.full_name}</div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeBadge}`}>{exam.exam_type}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3.5 sm:grid-cols-3">
        {subjects.map((s, i) => {
          const c = subjectColor(i);
          const r = exam.subject_results?.[s.key];
          const hasData = !!r;
          const d = Number(r?.dogru) || 0;
          const y = Number(r?.yanlis) || 0;
          const net = getSubjectNet(r, exam.exam_type);
          const prevR = previous?.subject_results?.[s.key];
          const prevNet = previous ? getSubjectNet(prevR, previous.exam_type) : null;
          return (
            <div key={s.key} className={`rounded-lg border p-2.5 ${c.border} ${c.bg}`}>
              <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${c.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {s.label}
              </div>
              {hasData ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-gray-500">{d}D · {y}Y</span>
                  <span className="flex items-center gap-1 text-[13px] font-bold text-gray-800">
                    {net}
                    <TrendIcon current={net} previous={prevR ? prevNet : null} />
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-300">Veri yok</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
        <span className="text-[11px] font-medium text-gray-500">Toplam Net</span>
        <span className="flex items-center gap-1 text-[15px] font-bold text-gray-900">
          {exam.net_score}
          <TrendIcon current={exam.net_score} previous={previous ? previous.net_score : null} />
        </span>
      </div>
    </div>
  );
}

// Seçilen denemelerde geçen tüm dersleri (tekrarsız) birleştirir.
// Karşılaştırmada "aynı ders" birden çok deneme türünde farklı
// anahtarlarla eşleşse bile, ilk gördüğü tanım kullanılır.
function unionSubjects(exams: any[]): SubjectDef[] {
  const map = new Map<string, SubjectDef>();
  exams.forEach((e) => {
    subjectsFor(e.exam_type).forEach((s) => {
      if (!map.has(s.key)) map.set(s.key, s);
    });
  });
  return Array.from(map.values());
}

// Tek bir dersin, seçilen tüm denemelerdeki sonucunu yan yana gösteren satır.
// Böylece "Türkçe" gibi bir dersin farklı denemelerdeki net değişimi
// tek bakışta, aynı blokta karşılaştırılabilir.
// Satırlar: dersler · Sütunlar: denemeler (kronolojik). Tek bakışta sığar.
function SubjectCompareTable({ exams }: { exams: any[] }) {
  const subjects = unionSubjects(exams);
  return (
    <div className="print-avoid rounded-lg border border-gray-200 bg-white">
      <table className="w-full table-fixed border-collapse text-[11px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="w-[88px] px-2 py-1.5 text-left font-medium text-gray-500">Ders</th>
            {exams.map((e) => (
              <th key={e.id} className="border-l border-gray-200 px-1.5 py-1.5 text-center">
                <div className="truncate font-medium text-gray-700" title={e.exam_name}>
                  {e.exam_name}
                </div>
                <div className="text-[9.5px] font-normal text-gray-400">
                  {new Date(e.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, si) => {
            const c = subjectColor(si);
            return (
              <tr key={s.key} className="border-t border-gray-100">
                <td className={`whitespace-nowrap px-2 py-1 font-semibold ${c.bg} ${c.text}`}>
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    {s.label}
                  </span>
                </td>
                {exams.map((e, i) => {
                  const r = e.subject_results?.[s.key];
                  const prevExam = i > 0 ? exams[i - 1] : null;
                  const prevR = prevExam?.subject_results?.[s.key];
                  const net = getSubjectNet(r, e.exam_type);
                  const prevNet = prevExam && prevR ? getSubjectNet(prevR, prevExam.exam_type) : null;
                  return (
                    <td key={e.id} className="border-l border-gray-100 px-1.5 py-1 text-center">
                      {r ? (
                        <>
                          <div className="text-[9.5px] leading-tight text-gray-400">
                            {Number(r.dogru) || 0}D · {Number(r.yanlis) || 0}Y
                          </div>
                          <div className="flex items-center justify-center gap-0.5 text-[12px] font-bold leading-tight text-gray-800">
                            {net}
                            <TrendIcon current={net} previous={prevR ? prevNet : null} />
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t border-gray-200 bg-gray-50">
            <td className="px-2 py-1.5 font-semibold text-gray-700">Toplam Net</td>
            {exams.map((e, i) => (
              <td key={e.id} className="border-l border-gray-200 px-1.5 py-1.5 text-center">
                <span className="flex items-center justify-center gap-0.5 text-[13px] font-bold text-gray-900">
                  {e.net_score}
                  <TrendIcon current={e.net_score} previous={i > 0 ? exams[i - 1].net_score : null} />
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Zikzak (inişli çıkışlı) çizgi grafik ───────────────────────
// Deneme çubukları yerine, öğrenci bazlı net/puan trendini gösteren
// sade bir SVG çizgi grafik. Birden fazla öğrenci seçiliyse her biri
// kendi renginde ayrı bir çizgi olarak çizilir.
const STUDENT_LINE_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#EA580C', '#DB2777'];

interface ChartSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

function ZigzagChart({ labels, series }: { labels: string[]; series: ChartSeries[] }) {
  const width = 560;
  const height = 126;
  const pad = { top: 18, right: 14, bottom: 20, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (allValues.length === 0 || labels.length === 0) return null;

  const minV = Math.min(0, ...allValues);
  const maxV = Math.max(...allValues, minV + 1);
  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : 0;
  const xFor = (i: number) => pad.left + i * xStep;
  const yFor = (v: number) => pad.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: Math.max(260, labels.length * 52) }}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = pad.top + innerH * f;
            return <line key={f} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />;
          })}
          {labels.map((l, i) => (
            <text key={i} x={xFor(i)} y={height - 4} fontSize={9.5} textAnchor="middle" fill="#9CA3AF">{l}</text>
          ))}
          {series.map((s, si) => {
            const pts = s.values
              .map((v, i) => (v === null ? null : `${xFor(i)},${yFor(v)}`))
              .filter(Boolean)
              .join(' ');
            return (
              <g key={si}>
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                {s.values.map((v, i) => (
                  v === null ? null : (
                    <circle key={`c${i}`} cx={xFor(i)} cy={yFor(v)} r={3.5} fill={s.color} stroke="white" strokeWidth={1.5} />
                  )
                ))}
                {s.values.map((v, i) => (
                  v === null ? null : (
                    <text key={`t${i}`} x={xFor(i)} y={yFor(v) - 8} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={s.color}>{v}</text>
                  )
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      {series.length > 1 && (
        <div className="mt-1.5 flex flex-wrap gap-3">
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Yapay zeka analiz sonucu tipleri ──────────────────────────

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

// ─── Karşılaştırma modalı — alt alta, ders renkli, trend oklu ──

function ExamCompareModal({ exams, onClose }: { exams: any[]; onClose: () => void }) {
  // Kronolojik sıra: ilk deneme en üstte (solda), son deneme en altta (sağda)
  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => (a.exam_date < b.exam_date ? -1 : a.exam_date > b.exam_date ? 1 : 0)),
    [exams]
  );

  // Öğrenciye göre grupla, her öğrencinin kendi denemeleri kronolojik sırada
  const byStudent = useMemo(() => {
    const map = new Map<string, any[]>();
    sortedExams.forEach((e) => {
      const arr = map.get(e.student_id) ?? [];
      arr.push(e);
      map.set(e.student_id, arr);
    });
    return Array.from(map.values());
  }, [sortedExams]);

  const studentCount = byStudent.length;

  // Tüm seçili denemelerde geçen dersler — alttaki "ders bazlı trend" seçici için.
  const allSubjects = useMemo(() => unionSubjects(sortedExams), [sortedExams]);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('');
  const activeSubjectKey = selectedSubjectKey || allSubjects[0]?.key || '';

  // Grafiklerin x ekseni: tek öğrenci seçiliyse gerçek deneme adı/tarihi,
  // birden çok öğrenci seçiliyse (farklı denemeler olabileceğinden) sıra numarası.
  const maxSeqLen = Math.max(...byStudent.map((se) => se.length), 1);
  const chartLabels = studentCount === 1
    ? byStudent[0].map((e) => new Date(e.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }))
    : Array.from({ length: maxSeqLen }, (_, i) => `${i + 1}.`);

  const netChartSeries: ChartSeries[] = byStudent.map((se, i) => ({
    name: se[0].students?.full_name ?? `Öğrenci ${i + 1}`,
    color: STUDENT_LINE_COLORS[i % STUDENT_LINE_COLORS.length],
    values: Array.from({ length: chartLabels.length }, (_, idx) => se[idx] ? se[idx].net_score : null),
  }));

  const subjectChartSeries: ChartSeries[] = byStudent.map((se, i) => ({
    name: se[0].students?.full_name ?? `Öğrenci ${i + 1}`,
    color: STUDENT_LINE_COLORS[i % STUDENT_LINE_COLORS.length],
    values: Array.from({ length: chartLabels.length }, (_, idx) => {
      const e = se[idx];
      if (!e) return null;
      const r = e.subject_results?.[activeSubjectKey];
      return r ? getSubjectNet(r, e.exam_type) : null;
    }),
  }));

  const [includeMeetings, setIncludeMeetings] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ExamAnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/analiz/deneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examIds: sortedExams.map((e) => e.id),
          includeMeetings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analiz başarısız oldu.');
      setAnalysisResult(data.analysis);

      // Analizi öğrenci sayfasında görünmesi için kaydet (deneme adı + tarihle birlikte).
      // Bu uç nokta henüz yoksa sessizce yok sayılır — kullanıcı analiz sonucunu
      // yine de görür, sadece kalıcı kayıt oluşmaz.
      try {
        const saveRes = await fetch('/api/analiz/deneme/kaydet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examIds: sortedExams.map((e) => e.id),
            examNames: Array.from(new Set(sortedExams.map((e) => e.exam_name))),
            examDates: Array.from(new Set(sortedExams.map((e) => e.exam_date))),
            studentIds: Array.from(new Set(sortedExams.map((e) => e.student_id))),
            analysis: data.analysis,
          }),
        });
        if (saveRes.ok) setSaved(true);
      } catch {
        // sessizce geç
      }
    } catch (err: any) {
      setAnalysisError(err.message ?? 'Bir hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  }
    const landscape = sortedExams.length >= 4;
    return createPortal(
    <div className="compare-portal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="compare-print-root max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
        <style jsx global>{`
          @media print {
            @page { size: ${landscape ? 'A4 landscape' : 'A4 portrait'}; margin: 8mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body > *:not(.compare-portal) { display: none !important; }
            .compare-portal {
              position: static !important;
              display: block !important;
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              padding: 0 !important;
            }
            .compare-print-root {
              max-width: none !important;
              max-height: none !important;
              width: 100% !important;
              overflow: visible !important;
              border: 0 !important;
              box-shadow: none !important;
              padding: 0 !important;
              zoom: 0.9 !important;
            }
            .compare-print-root .no-print { display: none !important; }
            .compare-print-root .print-avoid { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>

        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">Deneme Karşılaştırma</h3>
          <div className="no-print flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
            >
              <IconPrinter size={14} /> Yazdır
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
              <IconX size={18} />
            </button>
          </div>
        </div>
        
                {/* Üstte tablo(lar), altında iki grafik yan yana */}
        <div className="space-y-3">
          {byStudent.map((studentExams) => (
            <div key={studentExams[0].student_id}>
              {studentCount > 1 && (
                <div className="mb-1 text-[12px] font-semibold text-gray-800">
                  {studentExams[0].students?.full_name}
                </div>
              )}
              <SubjectCompareTable exams={studentExams} />
            </div>
          ))}

          <div className="grid items-start gap-3 sm:grid-cols-2 print:grid-cols-2">
            <div className="print-avoid rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div className="mb-1 text-[12px] font-semibold text-gray-600">Toplam Net Trendi</div>
              <ZigzagChart labels={chartLabels} series={netChartSeries} />
            </div>

            {allSubjects.length > 0 && (
              <div className="print-avoid rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-gray-600">Ders Bazlı Net Trendi</span>
                  <select
                    value={activeSubjectKey}
                    onChange={(ev) => setSelectedSubjectKey(ev.target.value)}
                    className="no-print rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] text-gray-700"
                  >
                    {allSubjects.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <span className="hidden text-[11px] text-gray-500 print:inline">
                    {allSubjects.find((s) => s.key === activeSubjectKey)?.label}
                  </span>
                </div>
                <ZigzagChart labels={chartLabels} series={subjectChartSeries} />
              </div>
            )}
          </div>
        </div>

        {/* Yapay zeka analizi — sonuç varsa yazdırmaya dahil */}
                <div className={`mt-3 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/60 to-purple-50/60 p-4 ${analysisResult ? '' : 'no-print'}`}>
          {!analysisResult && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconSparkles size={19} className="text-blue-600" />
                  <span className="text-[15px] font-semibold text-gray-800">Yapay zeka ile analiz et</span>
                </div>
                <label className="flex items-center gap-1.5 text-[13px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeMeetings}
                    onChange={(ev) => setIncludeMeetings(ev.target.checked)}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  Görüşme notlarını da dahil et
                </label>
              </div>
              <p className="mt-2 text-[13px] text-gray-500">
                {studentCount > 1
                  ? `${studentCount} farklı öğrencinin denemeleri ayrı ayrı analiz edilip aralarında kıyaslama yapılacak.`
                  : 'Güçlü/zayıf dersler, trend ve öneriler oluşturulacak.'}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <><IconLoader2 size={16} className="animate-spin" /> Analiz ediliyor...</>
                ) : (
                  <><IconSparkles size={16} /> Yapay Zeka ile Analiz Et</>
                )}
              </button>
              {analysisError && <p className="mt-2 text-[13px] text-red-600">{analysisError}</p>}
            </>
          )}

          {analysisResult && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconSparkles size={19} className="text-blue-600" />
                  <span className="text-[15px] font-semibold text-gray-800">Yapay Zeka Analizi</span>
                  {saved && (
                    <span className="no-print flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <IconCheck size={12} /> Öğrenci sayfasına kaydedildi
                    </span>
                  )}
                </div>
                <button onClick={() => setAnalysisResult(null)} className="no-print text-[12px] text-gray-400 hover:text-gray-600">
                  Temizle
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2 print:grid-cols-2">
                  {analysisResult.ogrenciler.map((o, i) => (
                    <div key={i} className="print-avoid rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-2.5 text-[15px] font-bold text-gray-900">{o.student_name}</div>

                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {o.guclu_dersler.map((d) => (
                          <span key={d} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">+ {d}</span>
                        ))}
                        {o.zayif_dersler.map((d) => (
                          <span key={d} className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600">− {d}</span>
                        ))}
                      </div>

                      <p className="text-[13px] leading-relaxed text-gray-600">
                        <span className="font-semibold text-gray-700">Trend: </span>{o.trend}
                      </p>

                      {o.capraz_degerlendirme && (
                        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                          <span className="font-semibold text-gray-700">Görüşme değerlendirmesi: </span>
                          {o.capraz_degerlendirme}
                        </p>
                      )}

                      {o.oneriler.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[13px] font-semibold text-gray-700">Öneriler:</span>
                          <ul className="mt-1.5 list-inside list-disc space-y-1">
                            {o.oneriler.map((oneri, oi) => (
                              <li key={oi} className="text-[13px] leading-relaxed text-gray-600">{oneri}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {analysisResult.karsilastirma && (
                  <div className="print-avoid rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                    <div className="mb-2 text-[13.5px] font-bold text-purple-800">Öğrenciler Arası Kıyaslama</div>
                    <p className="text-[13px] leading-relaxed text-purple-900">{analysisResult.karsilastirma}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}