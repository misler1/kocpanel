'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { ExamTrack, StudentStatus } from '@/types/database';
import { IconArrowLeft, IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react';

// ─── Sabitler ────────────────────────────────────────────────

const TRACKS: { value: ExamTrack; label: string }[] = [
  { value: 'YKS_SAY', label: 'YKS · Sayısal' },
  { value: 'YKS_SOZ', label: 'YKS · Sözel' },
  { value: 'YKS_EA', label: 'YKS · Eşit Ağırlık' },
  { value: 'YKS_DIL', label: 'YKS · Dil' },
  { value: 'LGS', label: 'LGS' },
  { value: 'DIGER', label: 'Diğer' },
];

const AVATAR_COLORS = [
  { value: 'av-blue', bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  { value: 'av-teal', bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  { value: 'av-purple', bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
  { value: 'av-amber', bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { value: 'av-coral', bg: 'bg-[#FAECE7]', text: 'text-[#993C1D]' },
];

const GRADE_LEVELS = ['8. Sınıf', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun'];

const GUARDIAN_RELATIONS = ['Anne', 'Baba', 'Ağabey / Abla', 'Amca / Dayı', 'Hala / Teyze', 'Diğer'];

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'gorusme_bekliyor', label: 'Görüşme bekliyor' },
  { value: 'analiz_eksik', label: 'Analiz eksik' },
  { value: 'dikkat', label: 'Dikkat' },
  { value: 'pasif', label: 'Pasif' },
];

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

type Resources = Record<string, [string, string, string]>;

function getYksYear() {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

// ─── Yardımcı bileşenler ─────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-2 pt-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{children}</h2>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

// ─── Ana bileşen ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OgrenciDuzenleClient({ student }: { student: any }) {
  const router = useRouter();
  const supabase = createClient();

  const res: Resources = student.resources ?? {};

  // Temel
  const [fullName, setFullName] = useState(student.full_name ?? '');
  const [track, setTrack] = useState<ExamTrack>(student.track ?? 'YKS_SAY');
  const [avatarColor, setAvatarColor] = useState(student.avatar_color ?? 'av-blue');
  const [status, setStatus] = useState<StudentStatus>(student.status ?? 'aktif');
  const [phone, setPhone] = useState(student.phone ?? '');
  const [birthDate, setBirthDate] = useState(student.birth_date ?? '');
  const [gradeLevel, setGradeLevel] = useState(student.grade_level ?? '');
  const [notes, setNotes] = useState(student.notes ?? '');

  // Aile
  const [motherName, setMotherName] = useState(student.mother_name ?? '');
  const [motherJob, setMotherJob] = useState(student.mother_job ?? '');
  const [motherPhone, setMotherPhone] = useState(student.mother_phone ?? '');
  const [fatherName, setFatherName] = useState(student.father_name ?? '');
  const [fatherJob, setFatherJob] = useState(student.father_job ?? '');
  const [fatherPhone, setFatherPhone] = useState(student.father_phone ?? '');

  // Veli
  const [guardianName, setGuardianName] = useState(student.guardian_name ?? '');
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone ?? '');
  const [guardianRelation, setGuardianRelation] = useState(student.guardian_relation ?? '');

  // YKS
  const [yksYear, setYksYear] = useState<number>(student.yks_year ?? getYksYear());
  const [tytScore, setTytScore] = useState(student.tyt_score?.toString() ?? '');
  const [sayScore, setSayScore] = useState(student.say_score?.toString() ?? '');
  const [eaScore, setEaScore] = useState(student.ea_score?.toString() ?? '');
  const [sozScore, setSozScore] = useState(student.soz_score?.toString() ?? '');
  const [tytRank, setTytRank] = useState(student.tyt_rank?.toString() ?? '');
  const [sayRank, setSayRank] = useState(student.say_rank?.toString() ?? '');
  const [eaRank, setEaRank] = useState(student.ea_rank?.toString() ?? '');
  const [sozRank, setSozRank] = useState(student.soz_rank?.toString() ?? '');

  // Kaynaklar
  const [resources, setResources] = useState<Resources>(res);

  // UI
  const [showYks, setShowYks] = useState(!!student.tyt_score || !!student.yks_year);
  const [showResources, setShowResources] = useState(Object.keys(res).length > 0);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleGuardianQuickFill(src: 'anne' | 'baba') {
    if (src === 'anne') {
      setGuardianName(motherName);
      setGuardianPhone(motherPhone);
      setGuardianRelation('Anne');
    } else {
      setGuardianName(fatherName);
      setGuardianPhone(fatherPhone);
      setGuardianRelation('Baba');
    }
  }

  function updateResource(subject: string, idx: 0 | 1 | 2, value: string) {
    setResources((prev) => {
      const current: [string, string, string] = prev[subject] ?? ['', '', ''];
      const updated: [string, string, string] = [...current] as [string, string, string];
      updated[idx] = value;
      return { ...prev, [subject]: updated };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const isYks = track.startsWith('YKS');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('students') as any)
      .update({
        full_name: fullName.trim(),
        track,
        avatar_color: avatarColor,
        status,
        phone: phone.trim() || null,
        birth_date: birthDate || null,
        grade_level: gradeLevel || null,
        notes: notes.trim() || null,
        mother_name: motherName.trim() || null,
        mother_job: motherJob.trim() || null,
        mother_phone: motherPhone.trim() || null,
        father_name: fatherName.trim() || null,
        father_job: fatherJob.trim() || null,
        father_phone: fatherPhone.trim() || null,
        guardian_name: guardianName.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        guardian_relation: guardianRelation || null,
        yks_year: isYks && showYks ? yksYear : null,
        tyt_score: isYks && showYks && tytScore ? Number(tytScore) : null,
        say_score: isYks && showYks && sayScore ? Number(sayScore) : null,
        ea_score: isYks && showYks && eaScore ? Number(eaScore) : null,
        soz_score: isYks && showYks && sozScore ? Number(sozScore) : null,
        tyt_rank: isYks && showYks && tytRank ? Number(tytRank) : null,
        say_rank: isYks && showYks && sayRank ? Number(sayRank) : null,
        ea_rank: isYks && showYks && eaRank ? Number(eaRank) : null,
        soz_rank: isYks && showYks && sozRank ? Number(sozRank) : null,
        resources: showResources ? resources : {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    if (updateError) {
      setError('Güncellenirken hata oluştu: ' + updateError.message);
      setLoading(false);
      return;
    }

    router.push(`/ogrenciler/${student.id}`);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('students') as any).delete().eq('id', student.id);
    router.push('/ogrenciler');
    router.refresh();
  }

  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const selectedColor = AVATAR_COLORS.find((c) => c.value === avatarColor)!;
  const subjects = TRACK_RESOURCES[track] ?? [];
  const isYks = track.startsWith('YKS');

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <div className="mb-5 flex items-center gap-3">
        <Link href={`/ogrenciler/${student.id}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 text-[18px] font-medium text-gray-900">{student.full_name} — Düzenle</h1>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50"
        >
          <IconTrash size={14} />
          Sil
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Temel Bilgiler ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
          <SectionTitle>Temel Bilgiler</SectionTitle>

          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${selectedColor.bg} ${selectedColor.text}`}>
              {initials}
            </div>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button key={c.value} type="button" onClick={() => setAvatarColor(c.value)}
                  className={`h-7 w-7 rounded-full ${c.bg} ${avatarColor === c.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Ad Soyad" required>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="Telefon">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0532 000 00 00" className={inputCls} />
            </Field>
            <Field label="Doğum Tarihi">
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Sınıf Düzeyi">
              <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className={inputCls}>
                <option value="">Seçiniz</option>
                {GRADE_LEVELS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Sınav Türü" required>
              <select value={track} onChange={(e) => setTrack(e.target.value as ExamTrack)} className={inputCls}>
                {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Durum">
              <select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notlar">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Öğrenci hakkında genel notlar..." className={inputCls} />
          </Field>
        </div>

        {/* ── Aile Bilgileri ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
          <SectionTitle>Aile Bilgileri</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Anne Adı">
              <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)}
                placeholder="Ayşe Kaya" className={inputCls} />
            </Field>
            <Field label="Anne Meslek">
              <input type="text" value={motherJob} onChange={(e) => setMotherJob(e.target.value)}
                placeholder="Öğretmen" className={inputCls} />
            </Field>
            <Field label="Anne Telefon">
              <input type="tel" value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)}
                placeholder="0532 000 00 00" className={inputCls} />
            </Field>
            <Field label="Baba Adı">
              <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)}
                placeholder="Mehmet Kaya" className={inputCls} />
            </Field>
            <Field label="Baba Meslek">
              <input type="text" value={fatherJob} onChange={(e) => setFatherJob(e.target.value)}
                placeholder="Mühendis" className={inputCls} />
            </Field>
            <Field label="Baba Telefon">
              <input type="tel" value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)}
                placeholder="0532 000 00 00" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* ── Veli Bilgileri ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
          <SectionTitle>Veli Bilgileri</SectionTitle>
          <div className="flex gap-3">
            <button type="button" onClick={() => handleGuardianQuickFill('anne')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50">
              Anne bilgilerinden al
            </button>
            <button type="button" onClick={() => handleGuardianQuickFill('baba')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50">
              Baba bilgilerinden al
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Veli Adı Soyadı">
              <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Ad Soyad" className={inputCls} />
            </Field>
            <Field label="Veli Telefon">
              <input type="tel" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="0532 000 00 00" className={inputCls} />
            </Field>
            <Field label="Yakınlık Durumu">
              <select value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} className={inputCls}>
                <option value="">Seçiniz</option>
                {GUARDIAN_RELATIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── YKS Sonuçları ── */}
        {isYks && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
            <button type="button" onClick={() => setShowYks((v) => !v)}
              className="flex w-full items-center justify-between">
              <SectionTitle>Önceki YKS Sonuçları</SectionTitle>
              {showYks ? <IconChevronUp size={18} className="text-gray-400" /> : <IconChevronDown size={18} className="text-gray-400" />}
            </button>

            {showYks && (
              <>
                <Field label="YKS Yılı">
                  <input type="number" value={yksYear} onChange={(e) => setYksYear(Number(e.target.value))}
                    min={2020} max={2035} className={`${inputCls} w-32`} />
                </Field>
                <div>
                  <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Puanlar</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'TYT', value: tytScore, set: setTytScore },
                      { label: 'Sayısal', value: sayScore, set: setSayScore },
                      { label: 'Eşit Ağırlık', value: eaScore, set: setEaScore },
                      { label: 'Sözel', value: sozScore, set: setSozScore },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="mb-1 block text-[12px] text-gray-500">{f.label}</label>
                        <input type="number" step="0.01" value={f.value}
                          onChange={(e) => f.set(e.target.value)} placeholder="–" className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Sıralamalar</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'TYT', value: tytRank, set: setTytRank },
                      { label: 'Sayısal', value: sayRank, set: setSayRank },
                      { label: 'Eşit Ağırlık', value: eaRank, set: setEaRank },
                      { label: 'Sözel', value: sozRank, set: setSozRank },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="mb-1 block text-[12px] text-gray-500">{f.label}</label>
                        <input type="number" value={f.value}
                          onChange={(e) => f.set(e.target.value)} placeholder="–" className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Kullanılan Kaynaklar ── */}
        {subjects.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-4">
            <button type="button" onClick={() => setShowResources((v) => !v)}
              className="flex w-full items-center justify-between">
              <SectionTitle>Kullanılan Kaynaklar</SectionTitle>
              {showResources ? <IconChevronUp size={18} className="text-gray-400" /> : <IconChevronDown size={18} className="text-gray-400" />}
            </button>
            {showResources && (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div key={subject}>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">{subject}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([0, 1, 2] as const).map((idx) => (
                        <input key={idx} type="text"
                          value={resources[subject]?.[idx] ?? ''}
                          onChange={(e) => updateResource(subject, idx, e.target.value)}
                          placeholder={`Kaynak ${idx + 1}`}
                          className={inputCls} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Link href={`/ogrenciler/${student.id}`}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm text-gray-600 hover:bg-gray-50">
            İptal
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}
          </button>
        </div>
      </form>

      {/* ── Silme onayı ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Öğrenciyi sil?</h3>
            <p className="mb-5 text-sm text-gray-500">
              <strong>{student.full_name}</strong> adlı öğrenciye ait tüm veriler (görüşmeler, denemeler, görevler) kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Vazgeç
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Siliniyor...' : 'Evet, sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
