import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';

// Koç panelinin ortak sayfa başlığı: ana sayfadaki renkli karşılama kartının dili.
// Her bölümün kendi renk teması var; böylece koç hangi sayfada olduğunu rengiyle de tanır.

export const HERO_THEMES = {
  violet: 'from-indigo-500 via-violet-500 to-fuchsia-500',
  sky: 'from-sky-500 via-blue-500 to-indigo-500',
  teal: 'from-teal-500 via-emerald-500 to-green-500',
  fuchsia: 'from-fuchsia-500 via-pink-500 to-rose-500',
  amber: 'from-amber-500 via-orange-500 to-rose-500',
  indigo: 'from-indigo-600 via-indigo-500 to-sky-500',
  rose: 'from-rose-500 via-pink-500 to-fuchsia-500',
  slate: 'from-slate-600 via-indigo-600 to-violet-600',
} as const;

export type HeroTheme = keyof typeof HERO_THEMES;

export function PageHero({ theme = 'violet', icon, title, subtitle, chips, actions, backHref }: {
  theme?: HeroTheme;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Başlığın altındaki beyaz özet rozetleri */
  chips?: ReactNode[];
  /** Sağdaki butonlar; beyaz bir zemin üzerinde gösterilir, mevcut buton stilleri bozulmaz */
  actions?: ReactNode;
  backHref?: string;
}) {
  const visibleChips = (chips ?? []).filter(Boolean);
  return (
    <div className={`no-print relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br ${HERO_THEMES[theme]} p-5 text-white shadow-sm`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-28 h-32 w-32 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {backHref && (
            <Link href={backHref} aria-label="Geri" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <IconArrowLeft size={18} />
            </Link>
          )}
          {icon && (
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-sm ring-1 ring-white/25">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[21px] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[13px] text-white/85">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-1.5 shadow-sm">
            {actions}
          </div>
        )}
      </div>
      {visibleChips.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-2 text-[12.5px]">
          {visibleChips.map((chip, i) => (
            <span key={i} className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{chip}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renkli başlıklı kutu (ana sayfadaki "Bu haftaki görüşmeler" kutusu gibi) */
export const SECTION_THEMES = {
  sky: { head: 'from-sky-50 border-sky-100', chip: 'bg-sky-500', link: 'text-sky-700' },
  teal: { head: 'from-teal-50 border-teal-100', chip: 'bg-teal-500', link: 'text-teal-700' },
  violet: { head: 'from-violet-50 border-violet-100', chip: 'bg-violet-500', link: 'text-violet-700' },
  amber: { head: 'from-amber-50 border-amber-100', chip: 'bg-amber-500', link: 'text-amber-700' },
  rose: { head: 'from-rose-50 border-rose-100', chip: 'bg-rose-500', link: 'text-rose-700' },
  indigo: { head: 'from-indigo-50 border-indigo-100', chip: 'bg-indigo-500', link: 'text-indigo-700' },
  fuchsia: { head: 'from-fuchsia-50 border-fuchsia-100', chip: 'bg-fuchsia-500', link: 'text-fuchsia-700' },
  emerald: { head: 'from-emerald-50 border-emerald-100', chip: 'bg-emerald-500', link: 'text-emerald-700' },
} as const;

export function SectionCard({ theme = 'violet', icon, title, right, children, className = '' }: {
  theme?: keyof typeof SECTION_THEMES;
  icon?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = SECTION_THEMES[theme];
  return (
    <section className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm ${className}`}>
      <div className={`flex items-center gap-2 border-b bg-gradient-to-r to-white px-4 py-3 ${t.head}`}>
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${t.chip}`}>{icon}</span>}
        <h2 className="mr-auto text-[15px] font-semibold text-[var(--ink)]">{title}</h2>
        {right && <div className={`text-[12.5px] font-medium ${t.link}`}>{right}</div>}
      </div>
      {children}
    </section>
  );
}
