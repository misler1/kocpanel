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
  examName?: string | null;
  examDate?: string | null;
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
  const [allStudents, setAllStudents] = useState<{ id: string; full_name: string }[]>([]);
    // manuel eşleştirme: satır index -> seçilen öğrenci id
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  // Seçilen türde sistemde zaten kayıtlı denemeler (tekrar yüklemeyi önlemek için)
  const [existing, setExisting] = useState<{ student_id: string; exam_name: string; exam_date: string }[]>([]);
  const norm = (s: string) => (s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  async function handleParse() {
    if (!file) { setError('Dosya seçin.'); return; }
    setError(null);
    setLoading(true);
    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const fd = new FormData();
      fd.append('file', file);
      if (!isPdf) fd.append('examType', examType);

      const endpoint = isPdf
        ? '/api/denemeler/toplu-yukle/parse-pdf'
        : '/api/denemeler/toplu-yukle/parse';
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.debugText
          ? `${data.error ?? 'Ayrıştırma başarısız.'}\n\n--- Ham metin (ilk 3000 karakter) ---\n${data.debugText}`
          : (data.error ?? 'Ayrıştırma başarısız.');
        throw new Error(msg);
      }
      setRows(data.preview);
      if (data.examType) setExamType(data.examType as ExamType);
      setAllStudents(data.students ?? []);
      setOverrides({});

      // Zaten yüklü denemeleri öğren: aynı öğrenci + aynı tür + (aynı ad veya aynı tarih)
      try {
        const et = (data.examType as ExamType) ?? examType;
        const er = await fetch(`/api/denemeler/toplu-yukle/mevcut?examType=${et}`);
        const ed = await er.json();
        setExisting(er.ok ? (ed.existing ?? []) : []);
      } catch {
        setExisting([]);
      }

      // PDF'ten deneme adı/tarihi otomatik çıkarıldıysa formu doldur
      if (isPdf) {
        if (data.examName) setExamName(data.examName);
        if (data.examDate) setExamDate(data.examDate);
      }
    } catch (e: any) {
      setError(e.message ?? 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  // Bu satırın deneme adı/tarihi (PDF'te satıra özel, yoksa formdaki değer)
  function rowName(r: PreviewRow) { return (r.examName || examName || '').trim(); }
  function rowDate(r: PreviewRow) { return r.examDate || examDate; }

  // Seçili öğrencide bu deneme zaten kayıtlı mı?
  function isAlreadyUploaded(r: PreviewRow, studentId: string | null): boolean {
    if (!studentId) return false;
    const n = norm(rowName(r));
    const d = rowDate(r);
    return existing.some(
      (x) => x.student_id === studentId && ((n && norm(x.exam_name) === n) || (d && x.exam_date === d))
    );
  }

  // Otomatik eşleşen öğrencide deneme zaten yüklüyse seçim boş bırakılır (elle seçilirse korunur)
  function resolvedStudentId(r: PreviewRow): string | null {
    if (overrides[r.rowIndex] !== undefined) return overrides[r.rowIndex] || null;
    const auto = r.match.studentId;
    return auto && isAlreadyUploaded(r, auto) ? null : auto;
  }
  const skippedRows = rows.filter(
    (r) => overrides[r.rowIndex] === undefined && r.match.studentId && isAlreadyUploaded(r, r.match.studentId)
  );

  const skippedIds = new Set(skippedRows.map((r) => r.rowIndex));
  const unresolvedCount = rows.filter((r) => !resolvedStudentId(r) && !skippedIds.has(r.rowIndex)).length;
  const savableCount = rows.filter((r) => !!resolvedStudentId(r)).length;

  async function handleSave() {
    const confirmed = rows
      .map((r) => ({
        studentId: resolvedStudentId(r),
        results: r.results,
        puan: r.puan,
        // PDF'te her kayıt kendi deneme adı/tarihini taşıyabilir; yoksa formdaki değer
        examName: (r.examName || examName).trim(),
        examDate: r.examDate || examDate,
      }))
      .filter((r) => !!r.studentId);

    if (confirmed.length === 0) { setError('Eşleştirilmiş satır yok.'); return; }
    if (confirmed.some((r) => !r.examName)) { setError('Deneme adı boş olamaz.'); return; }
    if (confirmed.some((r) => !r.examDate)) { setError('Tarih seçin.'); return; }
    setSaving(true);
    setError(null);
    try {
      // aynı deneme adı + tarihe sahip satırlar tek istekte kaydedilir
      const groups = new Map<string, typeof confirmed>();
      for (const r of confirmed) {
        const k = `${r.examName}||${r.examDate}`;
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      for (const list of groups.values()) {
        const res = await fetch('/api/denemeler/toplu-yukle/kaydet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examType,
            examName: list[0].examName,
            examDate: list[0].examDate,
            rows: list.map((r) => ({ studentId: r.studentId, results: r.results, puan: r.puan })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Kaydedilemedi.');
      }
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
        <h1 className="text-[18px] font-medium text-gray-900">Toplu deneme sonucu yükle</h1>
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Excel veya PDF dosyası</label>
          <input type="file" accept=".xlsx,.xls,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
            {skippedRows.length > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-gray-500">
                <IconCheck size={14} /> {skippedRows.length} öğrenci zaten yüklü (seçilmedi)
              </span>
            )}
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
                  const skipped = skippedIds.has(r.rowIndex);
                  const needsAttention = !skipped && (!r.match.studentId || r.match.isAmbiguous);
                  const dupManual = !skipped && !!resolvedId && overrides[r.rowIndex] !== undefined && isAlreadyUploaded(r, resolvedId);
                  return (
                    <tr key={r.rowIndex} className={needsAttention ? 'bg-amber-50/50' : ''}>
                      <td className="px-2 py-2 text-gray-700">
                        {r.rawName}
                        {skipped && (
                          <div className="text-[10.5px] text-gray-400">Zaten yüklü: {r.match.studentName}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={resolvedId ?? ''}
                          onChange={(e) => setOverrides((prev) => ({ ...prev, [r.rowIndex]: e.target.value }))}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-[12px]"
                        >
                          <option value="">— Seç —</option>
                          {r.match.alternatives.length > 0 && (
                            <optgroup label="Önerilen eşleşmeler">
                              {r.match.alternatives.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.full_name} ({Math.round(a.score * 100)}%)
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="Tüm öğrenciler">
                            {allStudents
                              .filter((s) => !r.match.alternatives.some((a) => a.id === s.id))
                              .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-500">{Math.round(r.match.score * 100)}%</td>
                      <td className="px-2 py-2 text-center">
                        {dupManual ? (
                          <span title="Bu öğrencide bu deneme zaten kayıtlı; yine de kaydedilecek" className="text-[10.5px] font-medium text-amber-600">Zaten kayıtlı!</span>
                        ) : skipped ? (
                          <span className="text-[10.5px] text-gray-400">Atlandı</span>
                        ) : resolvedId ? (
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
            <button onClick={handleSave} disabled={saving || savableCount === 0}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : `${savableCount} Kaydı Onayla ve Kaydet`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}