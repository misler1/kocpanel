'use client';

import { useState } from 'react';

// Mesajlarda kullanılan emoji seçici (ek paket yok; sık kullanılanlar kategorilere ayrılmış)

/** Mesaja dokununca çıkan hızlı tepkiler */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '✅'];

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Yüzler', icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎',
      '🤩', '🥳', '🤗', '🤔', '🤨', '😐', '😶', '🙄', '😏', '😌', '😴', '🤓', '🧐', '😮', '😲', '😳',
      '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😱', '😓', '😬', '🤐', '🤒', '🤕', '😇', '🤭', '🫡'],
  },
  {
    label: 'Eller', icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '✋', '👌', '🤞', '✌️', '🤟', '💪', '👊', '✊', '👉',
      '👈', '👆', '👇', '☝️', '🫶', '✍️', '🤙', '🫰'],
  },
  {
    label: 'Kalpler ve işaretler', icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖', '💯', '✅', '☑️', '❌', '⭕', '❗', '❓', '⚠️',
      '⭐', '🌟', '✨', '🔥', '🎉', '🎊', '🏆', '🥇', '🎯', '🚀', '💡', '⏰', '📌', '🔔'],
  },
  {
    label: 'Okul', icon: '📚',
    emojis: ['📚', '📖', '📝', '✏️', '🖊️', '📐', '📏', '🔢', '🧮', '🧪', '🔬', '🧬', '🌍', '🏛️', '💭', '🗓️',
      '📅', '⏳', '🎒', '🏫', '🎓', '💻', '📱', '☕'],
  },
];

export function EmojiPicker({ onPick, className = '' }: { onPick: (emoji: string) => void; className?: string }) {
  const [cat, setCat] = useState(0);
  return (
    <div className={`w-[288px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl ${className}`}>
      <div className="flex border-b border-[var(--border)] bg-[var(--paper)]">
        {CATEGORIES.map((c, i) => (
          <button key={c.label} type="button" onClick={() => setCat(i)} title={c.label} aria-label={c.label}
            className={`flex-1 py-1.5 text-[18px] transition-colors ${i === cat ? 'bg-[var(--card)] shadow-[inset_0_-2px_0_var(--accent)]' : 'opacity-60 hover:opacity-100'}`}>
            {c.icon}
          </button>
        ))}
      </div>
      <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
        {CATEGORIES[cat].emojis.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[20px] transition-transform hover:scale-110 hover:bg-[var(--paper)]">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
