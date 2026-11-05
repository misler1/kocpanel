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
                <EmbedView url={c.url!} title={c.title} />
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

export function StudentBoard({ items }: { items: FeedItem[] }) {
  const notes = items.filter((i) => i.kind === 'duyuru').slice(0, 6);
  if (!notes.length) return null;

  return (
    <div className="rounded-[28px] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-5">
      <h2 className="mb-3 text-[18px] font-extrabold text-[var(--ink)]">📌 Pano</h2>
      <ul className="space-y-2.5">
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl bg-white/80 px-3.5 py-3 shadow-sm">
            {n.title && <p className="text-[14.5px] font-extrabold text-[var(--ink)]">{n.title}</p>}
            <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-[var(--ink)]">{n.body}</p>
            <p suppressHydrationWarning className="mt-1 text-[12px] font-semibold text-[var(--ink-muted)]">{n.author_name} · {when(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
