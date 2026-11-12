'use client';

import { useState } from 'react';
import { parseEmbed } from '@/lib/embed';
import { EmbedView } from './EmbedView';

// Öğrenci ana sayfası: koçunun/öğretmenlerinin paylaştığı içerikler ve pano duyuruları (supabase/home_feed.sql → student_feed)

export type FeedItem = { id: string; kind: 'icerik' | 'duyuru'; url: string | null; title: string | null; body: string | null; created_at: string; author_name: string | null };

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

export function StudentContentCard({ items }: { items: FeedItem[] }) {
  const contents = items.filter((i) => i.kind === 'icerik' && i.url).slice(0, 5);
  const [open, setOpen] = useState(contents[0]?.id ?? null);
  if (!contents.length) return null;

  return (
    <div className="rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-4 md:p-5">
      <h2 className="mb-3 text-[18px] font-extrabold text-[var(--ink)]">🎬 Koçundan sana</h2>
      <div className="space-y-3">
        {contents.map((c) => (
          <div key={c.id}>
            {open === c.id ? (
              <div>
                {c.title && <p className="mb-2 text-[14.5px] font-bold text-[var(--ink)]">{c.title}</p>}
                <EmbedView url={c.url!} title={c.title} trackPostId={c.id} />
                <p suppressHydrationWarning className="mt-1 text-[12px] font-semibold text-[var(--ink-muted)]">{c.author_name} · {when(c.created_at)}</p>
              </div>
            ) : (
              <button type="button" onClick={() => setOpen(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-2.5 text-left hover:bg-[var(--accent-soft)]">
                <span className="text-[20px]">▶️</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-[var(--ink)]">{c.title || parseEmbed(c.url!)?.label}</span>
                  <span suppressHydrationWarning className="block text-[12px] font-semibold text-[var(--ink-muted)]">{c.author_name} · {when(c.created_at)}</span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Her duyuru farklı renkte bir not kâğıdı gibi görünür (sırayla döner)
const NOTE_COLORS = [
  { bg: 'bg-amber-50', bar: 'border-amber-400', dot: 'bg-amber-500' },
  { bg: 'bg-sky-50', bar: 'border-sky-400', dot: 'bg-sky-500' },
  { bg: 'bg-pink-50', bar: 'border-pink-400', dot: 'bg-pink-500' },
  { bg: 'bg-emerald-50', bar: 'border-emerald-400', dot: 'bg-emerald-500' },
];

/** Son iki günde eklenen duyuru "Yeni" etiketi alır */
const isRecent = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 86_400_000;

const initialsOf = (name: string | null) =>
  (name ?? '').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toLocaleUpperCase('tr') || 'K';

export function StudentBoard({ items }: { items: FeedItem[] }) {
  const notes = items.filter((i) => i.kind === 'duyuru').slice(0, 10);
  const [all, setAll] = useState(false);
  if (!notes.length) return null;
  const shown = all ? notes : notes.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#F59E0B] via-[#F97316] to-[#EC4899] px-4 py-2.5 text-white">
        <span className="text-[18px]">📌</span>
        <h2 className="text-[17px] font-extrabold">Pano</h2>
        <span className="ml-auto rounded-full bg-white/25 px-2.5 py-0.5 text-[12px] font-bold">{notes.length} duyuru</span>
      </div>
      <ul className="space-y-2 p-2">
        {shown.map((n, i) => {
          const c = NOTE_COLORS[i % NOTE_COLORS.length];
          const isNew = isRecent(n.created_at);
          return (
            <li key={n.id} className={`rounded-2xl border-l-[6px] ${c.bar} ${c.bg} px-4 py-3.5`}>
              <div className="flex items-start gap-2">
                {n.title && <p className="flex-1 text-[16px] font-extrabold leading-snug text-[var(--ink)]">{n.title}</p>}
                {isNew && (
                  <span suppressHydrationWarning className={`${n.title ? '' : 'ml-auto'} flex-shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold text-white`}>Yeni</span>
                )}
              </div>
              <p className={`whitespace-pre-line text-[15.5px] font-semibold leading-relaxed text-[var(--ink)] ${n.title ? 'mt-1' : ''}`}>{n.body}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${c.dot} text-[10.5px] font-extrabold text-white`}>{initialsOf(n.author_name)}</span>
                <span suppressHydrationWarning className="text-[12.5px] font-bold text-[var(--ink-muted)]">{n.author_name} · {when(n.created_at)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {notes.length > 3 && (
        <button type="button" onClick={() => setAll(!all)}
          className="mb-2 ml-3 rounded-full px-2 py-1 text-[13px] font-extrabold text-[var(--accent-dark)] hover:bg-[var(--accent-soft)]">
          {all ? 'Daha az göster' : `Tüm duyurular (${notes.length})`}
        </button>
      )}
    </section>
  );
}
