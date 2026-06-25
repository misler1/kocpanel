'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconTrash, IconCopy, IconDeviceFloppy } from '@tabler/icons-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export interface ProgramRow {
  id: string;
  gun: string;
  saat: string;
  ders: string;
  konu: string;
  hedef: string;
}

export type ProgramMap = Record<string, ProgramRow[]>;

// ─── Kopyala popup ────────────────────────────────────────────

function CopyPopup({
  currentGun,
  onCopy,
  onClose,
}: {
  currentGun: string;
  onCopy: (targetGuns: string[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-6 z-50 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
      <p className="mb-1.5 px-1 text-[11px] font-medium text-gray-500">Hangi günlere kopyalansın?</p>
      <div className="flex flex-col gap-0.5">
        {DAYS.filter((d) => d !== currentGun).map((gun) => {
          const isChecked = selected.includes(gun);
          return (
            <label key={gun} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50">
              <input type="checkbox" checked={isChecked}
                onChange={() => setSelected((prev) => isChecked ? prev.filter((x) => x !== gun) : [...prev, gun])}
                className="h-3 w-3 accent-blue-500" />
              <span className="text-[12px] text-gray-700">{gun.slice(0, 3)}</span>
            </label>
          );
        })}
      </div>
      <button disabled={selected.length === 0}
        onClick={() => { onCopy(selected); onClose(); }}
        className="mt-2 w-full rounded-lg bg-blue-500 py-1 text-[12px] font-medium text-white disabled:opacity-30 hover:bg-blue-600">
        Kopyala
      </button>
    </div>
  );
}

// ─── Tek satır ────────────────────────────────────────────────

function ProgramBlock({
  row, gun, onUpdate, onDelete, onCopy,
}: {
  row: ProgramRow;
  gun: string;
  onUpdate: (id: string, field: keyof ProgramRow, value: string) => void;
  onDelete: (id: string) => void;
  onCopy: (rowId: string, targetGuns: string[]) => void;
}) {
  const [showCopy, setShowCopy] = useState(false);
  const ic = 'w-full rounded border border-gray-100 bg-gray-50 px-2 py-0.5 text-[12px] text-gray-700 placeholder-gray-300 focus:border-blue-300 focus:bg-white focus:outline-none';

  return (
    <div className="group relative rounded-lg border border-l-2 border-gray-100 border-l-blue-400 bg-white p-2">
      <input type="text" value={row.saat} onChange={(e) => onUpdate(row.id, 'saat', e.target.value)}
        placeholder="09:00" className={`mb-1.5 ${ic}`} />
      <input type="text" value={row.ders} onChange={(e) => onUpdate(row.id, 'ders', e.target.value)}
        placeholder="Ders" className={`mb-1 ${ic}`} />
      <input type="text" value={row.konu} onChange={(e) => onUpdate(row.id, 'konu', e.target.value)}
        placeholder="Konu" className={`mb-1 ${ic}`} />
      <input type="text" value={row.hedef} onChange={(e) => onUpdate(row.id, 'hedef', e.target.value)}
        placeholder="Hedef (ör: 40 soru)" className={ic} />

      <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
        <div className="relative">
          <button onClick={() => setShowCopy((v) => !v)}
            className="rounded p-0.5 text-gray-300 hover:text-blue-400" title="Kopyala">
            <IconCopy size={12} />
          </button>
          {showCopy && (
            <CopyPopup currentGun={gun} onCopy={(guns) => onCopy(row.id, guns)} onClose={() => setShowCopy(false)} />
          )}
        </div>
        <button onClick={() => onDelete(row.id)}
          className="rounded p-0.5 text-gray-300 hover:text-red-400" title="Sil">
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Gün kolonu ───────────────────────────────────────────────

function DayColumn({
  gun, rows, onUpdate, onDelete, onAdd, onCopy,
}: {
  gun: string;
  rows: ProgramRow[];
  onUpdate: (id: string, field: keyof ProgramRow, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: (gun: string) => void;
  onCopy: (rowId: string, targetGuns: string[]) => void;
}) {
  return (
    <div className="flex min-h-[140px] flex-col rounded-xl border border-gray-200 bg-gray-50 p-2">
      <div className="mb-2 text-[11px] font-semibold text-gray-500">{gun.slice(0, 3)}</div>
      <div className="flex flex-1 flex-col gap-1.5">
        {rows.length === 0 && (
          <p className="py-3 text-center text-[11px] text-gray-300">Boş</p>
        )}
        {rows.map((row) => (
          <ProgramBlock key={row.id} row={row} gun={gun}
            onUpdate={onUpdate} onDelete={onDelete} onCopy={onCopy} />
        ))}
      </div>
      <button onClick={() => onAdd(gun)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-1.5 text-[11px] text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500">
        <IconPlus size={12} />
        Ekle
      </button>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────

export default function DersProgramiClient({
  students,
  initialStudentId,
  initialRows,
}: {
  students: { id: string; full_name: string }[];
  initialStudentId: string;
  initialRows: ProgramRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [studentId, setStudentId] = useState(initialStudentId);
  const [saving, setSaving] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [saved, setSaved] = useState(false);

  function buildMap(rows: ProgramRow[]): ProgramMap {
    const map: ProgramMap = {};
    DAYS.forEach((g) => { map[g] = []; });
    rows.forEach((r) => { if (map[r.gun]) map[r.gun].push(r); });
    return map;
  }

  const [programMap, setProgramMap] = useState<ProgramMap>(buildMap(initialRows));

  async function handleStudentChange(id: string) {
    setStudentId(id);
    setLoadingStudent(true);
    const { data } = await (supabase as any)
      .from('ders_programi').select('*').eq('student_id', id).order('sira');
    setProgramMap(buildMap((data ?? []).map((r: any) => ({
      id: r.id, gun: r.gun, saat: r.saat ?? '',
      ders: r.ders ?? '', konu: r.konu ?? '', hedef: r.hedef ?? '',
    }))));
    setLoadingStudent(false);
  }

  function handleUpdate(id: string, field: keyof ProgramRow, value: string) {
    setProgramMap((prev) => {
      const next = { ...prev };
      for (const gun of DAYS) {
        next[gun] = next[gun].map((r) => r.id === id ? { ...r, [field]: value } : r);
      }
      return next;
    });
  }

  function handleDelete(id: string) {
    setProgramMap((prev) => {
      const next = { ...prev };
      for (const gun of DAYS) { next[gun] = next[gun].filter((r) => r.id !== id); }
      return next;
    });
  }

  function handleAdd(gun: string) {
    const newRow: ProgramRow = { id: crypto.randomUUID(), gun, saat: '', ders: '', konu: '', hedef: '' };
    setProgramMap((prev) => ({ ...prev, [gun]: [...(prev[gun] ?? []), newRow] }));
  }

  function handleCopy(rowId: string, targetGuns: string[]) {
    let source: ProgramRow | undefined;
    for (const gun of DAYS) {
      source = programMap[gun]?.find((r) => r.id === rowId);
      if (source) break;
    }
    if (!source) return;
    setProgramMap((prev) => {
      const next = { ...prev };
      for (const gun of targetGuns) {
        const copy: ProgramRow = { ...source!, id: crypto.randomUUID(), gun };
        next[gun] = [...(next[gun] ?? []), copy];
      }
      return next;
    });
  }

  async function handleSave() {
    if (!studentId) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await (supabase as any).from('ders_programi').delete().eq('student_id', studentId);

    const toInsert: any[] = [];
    DAYS.forEach((gun, gi) => {
      (programMap[gun] ?? []).forEach((row, ri) => {
        toInsert.push({
          student_id: studentId, coach_id: user.id, gun,
          saat: row.saat || null, ders: row.ders || null,
          konu: row.konu || null, hedef: row.hedef || null,
          sira: gi * 100 + ri,
        });
      });
    });

    if (toInsert.length > 0) {
      await (supabase as any).from('ders_programi').insert(toInsert);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push(`/ogrenciler/${studentId}`);
    }, 600);
  }

  const totalRows = DAYS.reduce((s, g) => s + (programMap[g]?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Başlık */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Ders programı</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {!studentId ? 'Öğrenci seçin' : totalRows > 0 ? `${totalRows} ders bloğu` : 'Program boş — Ekle butonuyla başlayın'}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || !studentId}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <IconDeviceFloppy size={16} />
          {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
        </button>
      </div>

      {/* Öğrenci seçimi */}
      {students.length === 0 ? (
        <p className="text-sm text-gray-400">Henüz öğrenci eklenmemiş.</p>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2">
          {students.map((s) => (
            <button key={s.id} onClick={() => handleStudentChange(s.id)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                studentId === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.full_name}
            </button>
          ))}
        </div>
      )}

      {loadingStudent ? (
        <div className="py-12 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : studentId ? (
        <>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((gun) => (
              <DayColumn key={gun} gun={gun} rows={programMap[gun] ?? []}
                onUpdate={handleUpdate} onDelete={handleDelete} onAdd={handleAdd} onCopy={handleCopy} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            💡 Bir bloğun üzerine gelince kopyala ve sil ikonları çıkar. Kopyala ile aynı bloğu diğer günlere ekleyebilirsin.
          </p>
        </>
      ) : null}
    </div>
  );
}
