'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  IconPlus,
  IconClipboardList,
  IconLink,
  IconChartBar,
  IconEdit,
  IconSparkles,
  IconArchive,
  IconArchiveOff,
  IconTrash,
  IconDotsVertical,
} from '@tabler/icons-react';

const DEFAULT_OPTIONS = [
  'Konu Eksiğim Yok',
  'Konu Eksiğim Var',
  '1 Kaynaktan Soru Bitirdim',
  '2 Kaynaktan Soru Bitirdim',
  '3 Kaynaktan Soru Bitirdim',
  'Bu konuda soru kaçırmam',
  'Soru Eksiğim Var',
];

// Google Form'dan alınan hazır TYT şablonu
const TYT_TEMPLATE: { subject: string; topics: string[] }[] = [
  {
    subject: 'Türkçe Konuları',
    topics: [
      'Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf Anlatım Teknikleri',
      'Paragraf Düşünceyi Geliştirme Yolları', 'Paragrafta Yapı', 'Paragraf Ana Düşünce',
      'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Sözcükte Yapı ve Ekler',
      'Sözcük Türleri - İsimler', 'Sözcük Türleri - Zamirler', 'Sözcük Türleri - Sıfatlar',
      'Sözcük Türleri - Zarflar', 'Sözcük Türleri - Edat, Bağlaç, Ünlem',
      'Fiiller - Fiilde Anlam', 'Fiiller - Ek Fiil', 'Fiiller - Fiilimsi', 'Fiiller - Fiilde Çatı',
      'Cümlenin Öğeleri', 'Cümle Türleri', 'Anlatım Bozuklukları',
    ],
  },
  {
    subject: 'TYT Matematik Konuları',
    topics: [
      'Temel Kavramlar', 'Sayı Basamakları', 'Bölme Bölünebilme', 'Ebob Ekok', 'Rasyonel Sayılar',
      'Birinci Dereceden Denklemler', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar',
      'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran Orantı', 'Sayı Problemleri', 'Kesir Problemleri',
      'Yaş Problemleri', 'Yüzde Problemleri', 'Kar Zarar Problemleri', 'Hareket Problemleri',
      'İşçi Problemleri', 'Tablo Grafik Problemleri', 'Rutin Olmayan Problemleri', 'Kümeler',
      'Mantık', 'Fonksiyonlar', 'Permütasyon Kombinasyon', 'Olasılık', 'Veri ve İstatistik',
      'İkinci Dereceden Denklemler', 'Polinomlar',
    ],
  },
  {
    subject: 'TYT Fizik Konuları',
    topics: [
      'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet', 'İş, Güç ve Enerji',
      'Isı, Sıcaklık ve Genleşme', 'Basınç', 'Kaldırma Kuvveti', 'Elektrostatik',
      'Elektrik ve Manyetizma', 'Dalgalar', 'Optik',
    ],
  },
  {
    subject: 'TYT Kimya Konuları',
    topics: [
      'Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler',
      'Maddenin Halleri', 'Doğa ve Kimya', 'Kimyanın Temel Kanunları', 'Kimyasal Hesaplamalar',
      'Karışımlar', 'Asit, Baz ve Tuz', 'Kimya Her Yerde',
    ],
  },
  {
    subject: 'TYT Biyoloji Konuları',
    topics: [
      'Canlıların Ortak Özellikleri', 'Canlıların Temel Bileşenleri', 'Hücre ve Organelleri',
      'Hücre Zarından Madde Geçişi', 'Canlıların Sınıflandırılması', 'Mitoz ve Eşeysiz Üreme',
      'Mayoz ve Eşeyli Üreme', 'Kalıtım', 'Ekosistem Ekolojisi', 'Güncel Çevre Sorunları',
    ],
  },
];

export function AnketlerClient({ initialSurveys, coachId }: { initialSurveys: any[]; coachId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [surveys, setSurveys] = useState(initialSurveys);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Boş anket + şablon seçenekler oluşturur, döndürür
  async function createBaseSurvey(surveyTitle: string) {
    const { data: survey } = await (supabase.from('surveys') as any)
      .insert({ coach_id: coachId, title: surveyTitle })
      .select()
      .single();
    if (!survey) return null;

    const { data: question } = await (supabase.from('survey_questions') as any)
      .insert({
        survey_id: survey.id,
        survey_topic_id: null,
        question_type: 'multi_choice',
        label: 'Bu konudaki durumun nedir?',
        sort_order: 0,
      })
      .select()
      .single();

    const { data: options } = await (supabase.from('survey_options') as any)
      .insert(DEFAULT_OPTIONS.map((label, i) => ({ question_id: question.id, label, sort_order: i })))
      .select();

    const kacirmam = options?.find((o: any) => o.label === 'Bu konuda soru kaçırmam');
    const eksigimVar = options?.find((o: any) => o.label === 'Soru Eksiğim Var');
    if (kacirmam && eksigimVar) {
      await (supabase.from('survey_options') as any)
        .update({ excludes_option_id: eksigimVar.id })
        .eq('id', kacirmam.id);
    }

    const kaynakOptions = options?.filter((o: any) =>
      ['1 Kaynaktan Soru Bitirdim', '2 Kaynaktan Soru Bitirdim', '3 Kaynaktan Soru Bitirdim'].includes(o.label)
    ) ?? [];
    if (kaynakOptions.length > 0) {
      await (supabase.from('survey_options') as any)
        .update({ exclusive_group: 'kaynak_sayisi' })
        .in('id', kaynakOptions.map((o: any) => o.id));
    }

    await (supabase.from('surveys') as any)
      .update({ topic_option_template_question_id: question.id })
      .eq('id', survey.id);

    return survey;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const survey = await createBaseSurvey(title.trim());
    setSaving(false);
    if (survey) router.push(`/anketler/${survey.id}/duzenle`);
  }

  // Google Form'dan alınan hazır TYT şablonunu tek tıkla oluşturur
  async function createFromTemplate() {
    setSeeding(true);
    const survey = await createBaseSurvey('TYT Konularında Uzmanlaşma Bilgisi Ölçme Formu');
    if (!survey) { setSeeding(false); return; }

    for (let i = 0; i < TYT_TEMPLATE.length; i++) {
      const { subject, topics } = TYT_TEMPLATE[i];
      const { data: subjectRow } = await (supabase.from('survey_subjects') as any)
        .insert({ survey_id: survey.id, name: subject, sort_order: i })
        .select()
        .single();
      if (!subjectRow) continue;

      await (supabase.from('survey_topics') as any).insert(
        topics.map((name, j) => ({ survey_subject_id: subjectRow.id, name, sort_order: j }))
      );
    }

    await (supabase.from('survey_questions') as any).insert({
      survey_id: survey.id,
      survey_topic_id: null,
      question_type: 'text',
      label: 'Başka yorum ve/veya sorunuz var mı?',
      sort_order: 1,
    });

    setSeeding(false);
    router.push(`/anketler/${survey.id}/duzenle`);
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/anket/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

    async function toggleArchive(survey: any) {
    setArchivingId(survey.id);
    const newValue = !survey.is_active;
    const { error } = await (supabase.from('surveys') as any)
      .update({ is_active: newValue })
      .eq('id', survey.id);
    if (!error) {
      setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, is_active: newValue } : s));
    }
    setArchivingId(null);
    setOpenMenuId(null);
  }

  async function handleDeleteSurvey() {
    if (!deletingSurvey) return;
    setDeleting(true);

    // Bağlı verileri sırayla temizle (foreign key kısıtları için)
    const surveyId = deletingSurvey.id;
    const { data: responseRows } = await (supabase.from('survey_responses') as any)
      .select('id').eq('survey_id', surveyId);
    const responseIds = (responseRows ?? []).map((r: any) => r.id);
    if (responseIds.length > 0) {
      await (supabase.from('survey_answers') as any).delete().in('response_id', responseIds);
    }
    await (supabase.from('survey_responses') as any).delete().eq('survey_id', surveyId);

    const { data: subjectRows } = await (supabase.from('survey_subjects') as any)
      .select('id').eq('survey_id', surveyId);
    const subjectIds = (subjectRows ?? []).map((s: any) => s.id);
    if (subjectIds.length > 0) {
      await (supabase.from('survey_topics') as any).delete().in('survey_subject_id', subjectIds);
    }
    await (supabase.from('survey_subjects') as any).delete().eq('survey_id', surveyId);

    const { data: questionRows } = await (supabase.from('survey_questions') as any)
      .select('id').eq('survey_id', surveyId);
    const questionIds = (questionRows ?? []).map((q: any) => q.id);
    if (questionIds.length > 0) {
      await (supabase.from('survey_options') as any).delete().in('question_id', questionIds);
    }
    await (supabase.from('survey_questions') as any).delete().eq('survey_id', surveyId);

    await (supabase.from('surveys') as any).delete().eq('id', surveyId);

    setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
    setDeleting(false);
    setDeletingSurvey(null);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Anketler</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{surveys.length} anket</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={createFromTemplate}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--track-lgs)]/30 bg-[var(--track-lgs-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--track-lgs)] transition-colors hover:opacity-80 disabled:opacity-60"
          >
            <IconSparkles size={15} />
            {seeding ? 'Oluşturuluyor...' : 'TYT şablonundan oluştur'}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
          >
            <IconPlus size={15} />
            Yeni anket
          </button>
        </div>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Anket başlığı, örn. Konu Takip Formu — Ekim"
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {saving ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]"
          >
            Vazgeç
          </button>
        </form>
      )}

      {surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-24">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <IconClipboardList size={22} className="text-[var(--accent-dark)]" />
          </span>
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz anket oluşturulmamış.</p>
          <p className="text-[12px] text-[var(--ink-muted)]">
            Hızlı başlamak için yukarıdaki <span className="font-medium text-[var(--track-lgs)]">TYT şablonundan oluştur</span> butonunu deneyebilirsin.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]/30"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <IconClipboardList size={18} className="text-[var(--accent-dark)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{s.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
                    <span>{new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        s.is_active
                          ? 'bg-[var(--success-soft)] text-[var(--success)]'
                          : 'bg-[var(--paper)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {s.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--border)] pt-3">
                <button
                  onClick={() => copyLink(s.id)}
                  title="Öğrenci linkini kopyala"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                >
                  <IconLink size={14} />
                  {copiedId === s.id ? 'Kopyalandı ✓' : 'Link'}
                </button>
                <Link
                  href={`/anketler/${s.id}/sonuclar`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                >
                  <IconChartBar size={14} />
                  Sonuçlar
                </Link>
                <Link
                  href={`/anketler/${s.id}/duzenle`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-soft)] py-1.5 text-[12px] font-semibold text-[var(--accent-dark)] hover:opacity-80"
                >
                  <IconEdit size={14} />
                  Düzenle
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                    title="Diğer işlemler"
                    className="flex items-center justify-center rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                  >
                    <IconDotsVertical size={16} />
                  </button>
                  {openMenuId === s.id && (
                    <div className="absolute right-0 bottom-9 z-20 w-44 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
                      <button
                        onClick={() => toggleArchive(s)}
                        disabled={archivingId === s.id}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-50"
                      >
                        {s.is_active ? <IconArchive size={14} /> : <IconArchiveOff size={14} />}
                        {archivingId === s.id ? 'İşleniyor...' : s.is_active ? 'Arşivle' : 'Arşivden çıkar'}
                      </button>
                      <button
                        onClick={() => { setDeletingSurvey(s); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      >
                        <IconTrash size={14} />
                        Kalıcı olarak sil
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Silme onayı */}
      {deletingSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-[var(--ink)]">Anketi kalıcı olarak sil?</h3>
            <p className="mb-5 text-sm text-[var(--ink-muted)]">
              <strong>{deletingSurvey.title}</strong> anketine ait tüm sorular, seçenekler ve öğrenci yanıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingSurvey(null)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteSurvey}
                disabled={deleting}
                className="flex-1 rounded-lg bg-[var(--danger)] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? 'Siliniyor...' : 'Evet, kalıcı olarak sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

