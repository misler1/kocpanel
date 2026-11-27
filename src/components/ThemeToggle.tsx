'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';

// Açık / koyu tema: localStorage 'kd:theme'. Sayfa açılırken src/app/layout.tsx'teki betik <html class="dark"> ekler
// (yanıp sönme olmasın diye); bu düğme yalnızca değiştirir. Koyu renkler globals.css → "Karanlık mod".
export const THEME_KEY = 'kd:theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
  }

  return (
    <button type="button" onClick={toggle} aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={dark ? 'Açık tema' : 'Koyu tema'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)] ${className}`}>
      {dark ? <IconSun size={19} /> : <IconMoon size={19} />}
    </button>
  );
}
