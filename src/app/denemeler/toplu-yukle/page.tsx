
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconUpload, IconCheck, IconAlertTriangle } from '@tabler/icons-react';

type ExamType = 'TYT' | 'AYT' | 'LGS';

interface PreviewRow {
  rowIndex: number;
  rawName: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  puan?: number;
  match: {
    studentId: string | null;
    studentName: string | null;
    score: number;
    isAmbiguous: boolean;
    alternatives: { id: string; full_name: string; score: number }[];
  };
}

export default function TopluYuklePage() {
  const router = useRouter();
  const [examType, setExamType] = useState<ExamType>('TYT');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  // manuel eşleştirme: satır index -> seçilen öğrenci id
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  async function handleParse() {
    if (!file) { setError('Dosya seçin.'); return; }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('examType', examType);
      const res = await fetch('/api/denemeler/toplu-yukle/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ayrıştırma başarısız.');
      setRows(data.preview);
      setOverrides({});
    } catch (e: any) {
      setError(e.message ?? 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  function resolvedStudentId(r: PreviewRow): string | null {
    return overrides[r.rowIndex] ?? r.match.studentId;
  }

  const unresolvedCount = rows.filter((r) => !resolvedStudentId(r)).length;

  async function handleSave() {
    const confirmedRows = rows
      .map((r) => ({ studentId: resolvedStudentId(r), results: r.results, puan: r.puan }))
      .filter((r) => !!r.studentId) as { studentId: string; results: any; puan?: number }[];

    if (confirmedRows.length === 0) { setError('Eşleştirilmiş satır yok.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/denemeler/toplu-yukle/kaydet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType, examName, examDate, rows: confirmedRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Kaydedilemedi.');
      router.push('/denemeler');
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/denemeler" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="text-[18px] font-medium text-gray-900">Toplu deneme sonucu yükle (Excel)</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Deneme türü</label>
            <div className="flex gap-2">
              {(['TYT', 'AYT', 'LGS'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setExamType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    examType === t ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Deneme adı</label>
            <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Dijital TYT 5" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tarih</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Excel dosyası</label>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600" />
        </div>

        <button onClick={handleParse} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <IconUpload size={15} />
          {loading ? 'Okunuyor...' : 'Dosyayı Oku'}
        </button>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">
              Eşleştirme Önizlemesi ({rows.length} satır)
            </h2>
            {unresolvedCount > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-amber-600">
                <IconAlertTriangle size={14} /> {unresolvedCount} satır eşleşmedi
              </span>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Excel'deki İsim</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Eşleşen Öğrenci</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Skor</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const resolvedId = resolvedStudentId(r);
                  const needsAttention = !r.match.studentId || r.match.isAmbiguous;
                  return (
                    <tr key={r.rowIndex} className={needsAttention ? 'bg-amber-50/50' : ''}>
                      <td className="px-2 py-2 text-gray-700">{r.rawName}</td>
                      <td className="px-2 py-2">
                        <select
                          value={resolvedId ?? ''}
                          onChange={(e) => setOverrides((prev) => ({ ...prev, [r.rowIndex]: e.target.value }))}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-[12px]"
                        >
                          <option value="">— Seç —</option>
                          {r.match.alternatives.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.full_name} ({Math.round(a.score * 100)}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-500">{Math.round(r.match.score * 100)}%</td>
                      <td className="px-2 py-2 text-center">
                        {resolvedId ? (
                          <IconCheck size={15} className="mx-auto text-emerald-600" />
                        ) : (
                          <IconAlertTriangle size={15} className="mx-auto text-amber-500" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={handleSave} disabled={saving || unresolvedCount === rows.length}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : `${rows.length - unresolvedCount} Kaydı Onayla ve Kaydet`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}