'use client';

import { useId, useMemo, useRef, useState, type InputHTMLAttributes } from 'react';

// Öneri listeli metin kutusu.
// Tarayıcının hazır öneri listesi (<datalist>), ana ekrana eklenen uygulamada (PWA, özellikle Android'de
// Opera / Samsung Internet) hiç açılmayabiliyor. Bu bileşen öneri listesini kendisi çizer; her tarayıcıda
// ve ana ekran uygulamasında aynı çalışır. Serbest metin yazmak her zaman mümkündür.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'list'> & {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** Listede en fazla kaç öneri gösterilsin */
  maxItems?: number;
};

const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

export function SuggestInput({ value, onChange, options, maxItems = 50, onFocus, onBlur, onKeyDown, className, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = norm(value);
    const uniq = Array.from(new Set(options.filter((o) => o && o.trim())));
    const filtered = q ? uniq.filter((o) => norm(o).includes(q) && norm(o) !== q) : uniq;
    // Yazılanla başlayanlar önce
    if (q) filtered.sort((a, b) => Number(!norm(a).startsWith(q)) - Number(!norm(b).startsWith(q)));
    return filtered.slice(0, maxItems);
  }, [value, options, maxItems]);

  const show = open && matches.length > 0;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <input
        {...rest}
        ref={inputRef}
        type="text"
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={(e) => { setOpen(true); onFocus?.(e); }}
        onClick={() => setOpen(true)}
        onBlur={(e) => { setOpen(false); setActive(-1); onBlur?.(e); }}
        onKeyDown={(e) => {
          if (show && e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); return; }
          if (show && e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); return; }
          if (show && e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); return; }
          if (show && e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
          onKeyDown?.(e);
        }}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          // Dokunma / tıklama sırasında kutu odağı kaybetmesin (yoksa liste seçimden önce kapanır)
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border,#e5e7eb)] bg-[var(--card,#fff)] py-1 text-sm text-[var(--ink,#111827)] shadow-lg"
        >
          {matches.map((m, i) => (
            <li
              key={m}
              role="option"
              aria-selected={i === active}
              onClick={() => pick(m)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-[var(--accent-soft,#eff6ff)]' : ''}`}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
