'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconCalendarEvent, IconChevronRight, IconSearch, IconX } from '@tabler/icons-react';
import { avatarColor, avatarGradient, initials, trackPill } from '@/lib/ui-colors';

// Öğrenciler ve Görüşme kayıtları listelerinde ortak öğrenci kartı ve arama/filtre çubuğu.

export type StudentCardData = {
  id: string;
  full_name: string;
  track?: string | null;
  sinif_sube?: string | null;
  kurum?: string | null;
  status?: string | null;
  last_meeting_at?: string | null;
  is_intern_student?: boolean;
  responsible_coach_other_name?: string | null;
};

/** Son öğrenci görüşmesinden bu yana geçen gün (görüşme yoksa null) */
export function daysSinceMeeting(iso: string | null | undefined) {
  if (!iso) return null;
  const start = new Date(iso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/** Son görüşme rozeti: 7 güne kadar yeşil, 14 güne kadar sarı, sonrası ve hiç görüşme yoksa kırmızı */
function recency(iso: string | null | undefined) {
  const d = daysSinceMeeting(iso);
  if (d === null) return { text: 'Henüz görüşme yok', cls: 'bg-rose-50 text-rose-600' };
  const text = d === 0 ? 'Bugün görüşüldü' : d === 1 ? 'Dün görüşüldü' : `${d} gün önce görüşüldü`;
  if (d <= 7) return { text, cls: 'bg-emerald-50 text-emerald-700' };
  if (d <= 14) return { text, cls: 'bg-amber-50 text-amber-700' };
  return { text, cls: 'bg-rose-50 text-rose-600' };
}

/** Son görüşmesinin üzerinden `days` günden fazla geçmiş ya da hiç görüşülmemiş */
export function lateBy(s: { last_meeting_at?: string | null }, days: number) {
  const d = daysSinceMeeting(s.last_meeting_at);
  return d === null || d > days;
}

export function StudentCard({ student: s, href, statusLabel, showMeeting = true }: {
  student: StudentCardData;
  href: string;
  /** "6 gün önce görüşüldü" rozeti (Görüşme kayıtları); Öğrenciler listesinde gösterilmez */
  showMeeting?: boolean;
  /** Sağ altta gösterilecek ek durum etiketi (ör. Arşiv) */
  statusLabel?: { label: string; className: string } | null;
}) {
  const tp = trackPill(s.track);
  const isPasif = s.status === 'pasif';
  const rec = recency(s.last_meeting_at);
  const lastDate = s.last_meeting_at
    ? new Date(s.last_meeting_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isPasif ? 'opacity-70' : ''}`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${isPasif ? 'from-slate-300 to-slate-400' : avatarGradient(s.id)}`} />
      <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold ${avatarColor(s.id)}`}>
          {initials(s.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-[var(--ink)]">{s.full_name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
            {tp && <span className={`rounded-md px-1.5 py-px text-[10.5px] font-semibold ${tp.cls}`}>{tp.label}</span>}
            {s.sinif_sube && <span className="rounded-md bg-gray-100 px-1.5 py-px text-[10.5px] font-semibold text-gray-600">{s.sinif_sube}</span>}
            {s.kurum && <span className="truncate">{s.kurum}</span>}
          </div>
        </div>
        <IconChevronRight size={18} className="flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </div>
      {(showMeeting || s.is_intern_student || statusLabel) && (
      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] bg-gray-50/60 px-4 py-2.5">
        {showMeeting && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${rec.cls}`} title={lastDate ? `Son görüşme: ${lastDate}` : undefined}>
            <IconCalendarEvent size={13} /> {rec.text}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {s.is_intern_student && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Stajyer{s.responsible_coach_other_name ? `: ${s.responsible_coach_other_name}` : ''}
            </span>
          )}
          {statusLabel && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusLabel.className}`}>{statusLabel.label}</span>
          )}
        </span>
      </div>
      )}
    </Link>
  );
}

export function StudentGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/** Ada göre arama (Türkçe büyük/küçük harf duyarsız) */
export function matchesQuery(name: string, query: string) {
  const q = query.trim().toLocaleLowerCase('tr');
  return !q || name.toLocaleLowerCase('tr').includes(q);
}

export const toolbarSelectCls =
  'rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-sky-300 focus:outline-none';

/** Arama kutusu + sağında sıralama/filtre seçimleri */
export function ListToolbar({ query, onQuery, placeholder = 'Öğrenci ara…', children }: {
  query: string;
  onQuery: (q: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm sm:flex-row sm:items-center">
      <label className="flex flex-1 items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 focus-within:ring-2 focus-within:ring-sky-200">
        <IconSearch size={16} className="flex-shrink-0 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[13.5px] text-[var(--ink)] outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => onQuery('')} className="rounded p-0.5 text-gray-400 hover:text-gray-700" aria-label="Aramayı temizle">
            <IconX size={14} />
          </button>
        )}
      </label>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Sayılı filtre/bölüm düğmeleri (ör. Tümü 24 · 2 haftadır görüşülmeyen 3) */
export function FilterChips<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count: number; tone: 'sky' | 'rose' | 'amber' | 'emerald' }[];
}) {
  const TONES = {
    sky: 'border-sky-500 bg-sky-500 text-white',
    rose: 'border-rose-500 bg-rose-500 text-white',
    amber: 'border-amber-500 bg-amber-500 text-white',
    emerald: 'border-emerald-500 bg-emerald-500 text-white',
  };
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${on
              ? TONES[o.tone]
              : 'border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}
          >
            {o.label}
            <span className={`rounded-full px-1.5 text-[11.5px] ${on ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Liste içindeki renkli bölüm başlığı */
export function SectionTitle({ tone, icon, title, count }: {
  tone: 'rose' | 'emerald' | 'slate';
  icon: ReactNode;
  title: string;
  count: number;
}) {
  const TONES = {
    rose: 'bg-rose-100 text-rose-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <span className="text-[15px] font-bold text-[var(--ink)]">{title}</span>
      <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${TONES[tone]}`}>{count}</span>
    </div>
  );
}
