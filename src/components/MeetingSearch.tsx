'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Fragment, type ReactNode } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';

// Görüşme kayıtlarında içerik araması: konu, notlar ve görüşmeyi yapan kişi.
// Türkçe harf ve büyük/küçük harf duyarsız ("ogretmen" → "Öğretmen"); birden çok kelime yazılırsa hepsi geçmeli.

const FOLD: Record<string, string> = { ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u' };
/** Harf harf sadeleştirir; uzunluk değişmez (vurgulamada konumlar aynı kalsın diye) */
function fold(s: string) {
  let out = '';
  for (const ch of s) {
    const f = FOLD[ch] ?? ch.toLowerCase();
    out += f.length === ch.length ? f : ch;
  }
  return out;
}

export function searchTerms(q: string) {
  return fold(q.trim()).split(/\s+/).filter((t) => t.length > 0);
}

function fieldsOf(m: any): string[] {
  return [m.topic, m.notes, m.created_by_profile?.full_name, m.created_by_other_name].filter(Boolean).map(String);
}

/** Görüşme aranan kelimelerin hepsini (konu, not ya da görüşmeyi yapan) içeriyor mu */
export function meetingMatches(m: any, terms: string[]) {
  if (terms.length === 0) return true;
  const hay = fold(fieldsOf(m).join('\n'));
  return terms.every((t) => hay.includes(t));
}

/** Metinde aranan kelimeleri vurgular */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const f = fold(text);
  const marks: [number, number][] = [];
  for (const t of terms) {
    let i = f.indexOf(t);
    while (i >= 0) { marks.push([i, i + t.length]); i = f.indexOf(t, i + t.length); }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m]);
  }
  const parts: ReactNode[] = [];
  let pos = 0;
  merged.forEach(([a, b], k) => {
    if (a > pos) parts.push(<Fragment key={`t${k}`}>{text.slice(pos, a)}</Fragment>);
    parts.push(<mark key={`m${k}`} className="rounded bg-amber-200 px-0.5 text-inherit">{text.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < text.length) parts.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{parts}</>;
}

/** Notlardan, aranan kelimenin geçtiği kısa bölüm (çevresiyle) */
export function NoteSnippet({ text, terms, radius = 90 }: { text?: string | null; terms: string[]; radius?: number }) {
  if (!text) return null;
  const f = fold(text);
  const hits = terms.map((t) => f.indexOf(t)).filter((i) => i >= 0);
  if (!hits.length) return null;
  const at = Math.min(...hits);
  let start = Math.max(0, at - radius);
  let end = Math.min(text.length, at + radius * 2);
  // Kelimenin ortasından kesme
  if (start > 0) { const sp = text.lastIndexOf(' ', start); start = sp > 0 && at - sp < radius * 1.5 ? sp + 1 : start; }
  if (end < text.length) { const sp = text.indexOf(' ', end); end = sp > 0 && sp - end < 30 ? sp : end; }
  const piece = text.slice(start, end).replace(/\s*\n\s*/g, ' ⏎ ');
  return (
    <p className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
      {start > 0 && '… '}<Highlight text={piece} terms={terms} />{end < text.length && ' …'}
    </p>
  );
}

/** Görüşme içeriği arama kutusu */
export function MeetingSearchBox({ value, onChange, autoFocus, placeholder = 'Görüşme notlarında ve konularında ara…' }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
      <IconSearch size={16} className="flex-shrink-0 text-teal-600" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-transparent text-[13.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="rounded p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]" aria-label="Aramayı temizle">
          <IconX size={14} />
        </button>
      )}
    </label>
  );
}

/** Arama sonucu satırı: tarih, (öğrenci), konu ve notun eşleşen kısmı */
export function MeetingHit({ m, terms, studentName, onOpen }: { m: any; terms: string[]; studentName?: string; onOpen: () => void }) {
  const dt = new Date(m.scheduled_at);
  const isVeli = m.meeting_type === 'veli';
  const by = m.created_by_profile?.full_name ?? m.created_by_other_name;
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--accent-soft)]/50">
      <span className={`flex w-12 flex-shrink-0 flex-col items-center justify-center self-start rounded-xl bg-gradient-to-b py-1.5 leading-none text-white ${isVeli ? 'from-[#C96F85] to-[#D99A8E]' : 'from-[#14709C] to-[#0FA3A8]'}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">{dt.toLocaleDateString('tr-TR', { month: 'short' })}</span>
        <span className="mt-0.5 text-[17px] font-bold">{dt.getDate()}</span>
        <span className="mt-0.5 text-[9.5px] text-white/80">{dt.getFullYear()}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px]">
          {studentName && <span className="font-semibold text-[var(--ink)]">{studentName}</span>}
          {m.topic && <span className={studentName ? 'text-[var(--ink-muted)]' : 'font-semibold text-[var(--ink)]'}><Highlight text={m.topic} terms={terms} /></span>}
          {isVeli && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700">Veli</span>}
        </span>
        <NoteSnippet text={m.notes} terms={terms} />
        {by && <span className="block text-[11px] text-[var(--ink-muted)]">Görüşen: <Highlight text={by} terms={terms} /></span>}
      </span>
    </button>
  );
}
