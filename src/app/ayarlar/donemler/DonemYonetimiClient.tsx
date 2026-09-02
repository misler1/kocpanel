'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useExamFilter } from '@/lib/exam-filter-context';
import { IconArrowLeft, IconPlus, IconArrowRight } from '@tabler/icons-react';

const TRACK_LABELS: Record<string, string> = {
  YKS_SAY: 'YKS · SAY', YKS_SOZ: 'YKS · SÖZ', YKS_EA: 'YKS · EA',
  YKS_DIL: 'YKS · DİL', LGS: 'LGS', DIGER: 'Diğer',
};
const TRACK_OPTIONS = Object.keys(TRACK_LABELS);

interface Donem { id: string; donem_adi: string; created_at: string; }
interface StudentRow { id: string; full_name: string; track: string; kurum: string | null; donem: string | null; status: string; }

export function DonemYonetimiClient({
  initialDonemler, initialStudents, coachId,
}: { initialDonemler: Donem[]; initialStudents: StudentRow[]; coachId: string }) {
  const supabase = createClient();
  const { refreshOptions } = useExamFilter();
  void coachId;

  const [donemler, setDonemler] = useState<Donem[]>(initialDonemler);
  const [students, setStudents] = useState<StudentRow[]>(initialStudents);

  const [newDonemAdi, setNewDonemAdi] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Filtreler (hangi öğrenciler listelensin) ──
  const [filterDonem, setFilterDonem] = useState<string>(donemler[donemler.length - 1]?.donem_adi ?? '');
  const [filterKurum, setFilterKurum] = useState<string>('');
  const [filterTrack, setFilterTrack] = useState<string>('');

  const availableKurumlar = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { if (s.kurum && s.kurum.trim()) set.add(s.kurum.trim()); });
    return Array.from(set).sort();
  }, [students]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Hedef değerler (her biri opsiyonel) ──
  const [targetDonem, setTargetDonem] = useState<string>('');
  const [targetKurum, setTargetKurum] = useState<string>('');
  const [targetTrack, setTargetTrack] = useState<string>('');

  const [moving, setMoving] = useState(false);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);

  // ── Yeni dönem oluştur ──
  async function handleCreateDonem(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const adi = newDonemAdi.trim();
    if (!adi) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { data, error } = await (supabase as any)
      .from('donemler')
      .insert({ coach_id: user.id, donem_adi: adi })
      .select()
      .single();

    if (error) {
      setCreateError(
        error.code === '23505' ? 'Bu isimde bir dönem zaten var.' : 'Dönem oluşturulurken hata oluştu: ' + error.message
      );
      setCreating(false);
      return;
    }

    setDonemler((prev) => [...prev, data]);
    setNewDonemAdi('');
    setCreating(false);
    refreshOptions();
  }

  // ── Görünen öğrenciler (filtrelere göre) ──
  const visibleStudents = students.filter((s) => {
    if (filterDonem && s.donem !== filterDonem) return false;
    if (filterKurum && s.kurum !== filterKurum) return false;
    if (filterTrack && s.track !== filterTrack) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === visibleStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleStudents.map((s) => s.id));
    }
  }

  const hasAnyTarget = !!targetDonem || !!targetKurum || !!targetTrack;

  // ── Toplu güncelleme ──
  async function handleApply() {
    if (selectedIds.length === 0 || !hasAnyTarget) return;
    setMoving(true);
    setMoveMessage(null);

    const updatePayload: any = {};
    if (targetDonem) updatePayload.donem = targetDonem;
    if (targetKurum) updatePayload.kurum = targetKurum;
    if (targetTrack) updatePayload.track = targetTrack;

    const { error } = await (supabase as any)
      .from('students')
      .update(updatePayload)
      .in('id', selectedIds);

    if (error) {
      setMoveMessage('Hata: ' + error.message);
      setMoving(false);
      return;
    }

    setStudents((prev) => prev.map((s) => selectedIds.includes(s.id) ? { ...s, ...updatePayload } : s));

    const changes: string[] = [];
    if (targetDonem) changes.push(`dönem → ${targetDonem}`);
    if (targetKurum) changes.push(`kurum → ${targetKurum}`);
    if (targetTrack) changes.push(`alan → ${TRACK_LABELS[targetTrack] ?? targetTrack}`);
    setMoveMessage(`${selectedIds.length} öğrenci güncellendi: ${changes.join(', ')}.`);

    setSelectedIds([]);
    setTargetDonem('');
    setTargetKurum('');
    setTargetTrack('');
    setMoving(false);
    refreshOptions();
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/ayarlar" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="text-[18px] font-medium text-gray-900">Dönem ve öğrenci yönetimi</h1>
      </div>

      {/* ── Yeni dönem aç ── */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white px-5 py-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-400">Yeni dönem aç</h2>
        <form onSubmit={handleCreateDonem} className="flex gap-2">
          <input
            type="text"
            value={newDonemAdi}
            onChange={(e) => setNewDonemAdi(e.target.value)}
            placeholder="örn. 2027-2028"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button type="submit" disabled={creating || !newDonemAdi.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <IconPlus size={15} />
            {creating ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </form>
        {createError && <p className="mt-2 text-[12px] text-red-600">{createError}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {donemler.map((d) => (
            <span key={d.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
              {d.donem_adi}
            </span>
          ))}
        </div>
      </div>

      {/* ── Öğrencileri toplu düzenle ── */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
        <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-gray-400">Öğrencileri toplu düzenle</h2>
        <p className="mb-3 text-[12px] text-gray-400">
          Öğrencileri filtrele, seç, sonra dönem / kurum / alan bilgilerinden istediğini toplu olarak değiştir. Boş bıraktığın alan değişmez. Geçmiş kayıtlar (görüşme, deneme vb.) etkilenmez.
        </p>

        {/* Filtreler */}
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Dönem filtresi</label>
            <select value={filterDonem} onChange={(e) => { setFilterDonem(e.target.value); setSelectedIds([]); }}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
              <option value="">Tümü</option>
              {donemler.map((d) => <option key={d.id} value={d.donem_adi}>{d.donem_adi}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Kurum filtresi</label>
            <select value={filterKurum} onChange={(e) => { setFilterKurum(e.target.value); setSelectedIds([]); }}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
              <option value="">Tümü</option>
              {availableKurumlar.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Alan filtresi</label>
            <select value={filterTrack} onChange={(e) => { setFilterTrack(e.target.value); setSelectedIds([]); }}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
              <option value="">Tümü</option>
              {TRACK_OPTIONS.map((t) => <option key={t} value={t}>{TRACK_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        {/* Öğrenci listesi */}
        <div className="mb-3 max-h-72 overflow-y-auto rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
            <input type="checkbox"
              checked={visibleStudents.length > 0 && selectedIds.length === visibleStudents.length}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 accent-blue-600" />
            <span className="text-[11px] font-medium text-gray-500">Tümünü seç ({visibleStudents.length})</span>
          </div>
          {visibleStudents.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-gray-400">Bu filtreye uyan öğrenci yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleStudents.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50">
                  <input type="checkbox" checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="h-3.5 w-3.5 accent-blue-600" />
                  <span className="flex-1 text-[13px] text-gray-800">{s.full_name}</span>
                  <span className="text-[11px] text-gray-400">{TRACK_LABELS[s.track] ?? s.track}</span>
                  {s.kurum && <span className="text-[11px] text-gray-400">· {s.kurum}</span>}
                  {s.donem && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{s.donem}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Hedef değerler */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Yeni dönem</label>
            <select value={targetDonem} onChange={(e) => setTargetDonem(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
              <option value="">Değiştirme</option>
              {donemler.map((d) => <option key={d.id} value={d.donem_adi}>{d.donem_adi}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Yeni kurum</label>
            <input
              type="text"
              list="kurum-onerileri-toplu"
              value={targetKurum}
              onChange={(e) => setTargetKurum(e.target.value)}
              placeholder="Değiştirme"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
            />
            <datalist id="kurum-onerileri-toplu">
              {availableKurumlar.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Yeni alan</label>
            <select value={targetTrack} onChange={(e) => setTargetTrack(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
              <option value="">Değiştirme</option>
              {TRACK_OPTIONS.map((t) => <option key={t} value={t}>{TRACK_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleApply} disabled={moving || selectedIds.length === 0 || !hasAnyTarget}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <IconArrowRight size={15} />
          {moving ? 'Uygulanıyor...' : `Uygula (${selectedIds.length} öğrenci)`}
        </button>

        {moveMessage && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{moveMessage}</p>
        )}
      </div>
    </div>
  );
}