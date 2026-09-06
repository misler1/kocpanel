'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconClipboardList, IconLink, IconChartBar } from '@tabler/icons-react';

const DEFAULT_OPTIONS = [
  'Konu Eksiğim Yok',
  'Konu Eksiğim Var',
  '1 Kaynaktan Soru Bitirdim',
  '2 Kaynaktan Soru Bitirdim',
  '3 Kaynaktan Soru Bitirdim',
  'Bu konuda soru kaçırmam',
  'Soru Eksiğim Var',
];

export function AnketlerClient({ initialSurveys, coachId }: { initialSurveys: any[]; coachId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [surveys, setSurveys] = useState(initialSurveys);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    // 1) Anket
    const { data: survey } = await (supabase.from('surveys') as any)
      .insert({ coach_id: coachId, title: title.trim() })
      .select()
      .single();
    if (!survey) { setSaving(false); return; }

    // 2) Şablon soru
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

    // 3) Varsayılan 7 seçenek
    const { data: options } = await (supabase.from('survey_options') as any)
      .insert(
        DEFAULT_OPTIONS.map((label, i) => ({
          question_id: question.id,
          label,
          sort_order: i,
        }))
      )
      .select();

    // 4) "Bu konuda soru kaçırmam" -> "Soru Eksiğim Var" hariç tutsun
    const kacirmam = options?.find((o: any) => o.label === 'Bu konuda soru kaçırmam');
    const eksigimVar = options?.find((o: any) => o.label === 'Soru Eksiğim Var');
    if (kacirmam && eksigimVar) {
      await (supabase.from('survey_options') as any)
        .update({ excludes_option_id: eksigimVar.id })
        .eq('id', kacirmam.id);
    }

    // 5) Anketi şablon soruya bağla
    await (supabase.from('surveys') as any)
      .update({ topic_option_template_question_id: question.id })
      .eq('id', survey.id);

    router.push(`/anketler/${survey.id}/duzenle`);
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/anket/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink)]">Anketler</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{surveys.length} anket</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
          Yeni anket
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-20">
          <IconClipboardList size={32} className="text-[var(--ink-muted)]" />
          <p className="text-[13px] text-[var(--ink-muted)]">Henüz anket oluşturulmamış.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-[var(--ink)]">{s.title}</div>
                <div className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                  {new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}
                  <span className={s.is_active ? 'text-[var(--success)]' : 'text-[var(--ink-muted)]'}>
                    {s.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => copyLink(s.id)}
                title="Öğrenci linkini kopyala"
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
              >
                <IconLink size={14} />
                {copiedId === s.id ? 'Kopyalandı ✓' : 'Link'}
              </button>

              <Link
                href={`/anketler/${s.id}/sonuclar`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
              >
                <IconChartBar size={14} />
                Sonuçlar
              </Link>

              <Link
                href={`/anketler/${s.id}/duzenle`}
                className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent-dark)] hover:opacity-80"
              >
                Düzenle
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}