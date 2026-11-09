import type { ReactNode } from 'react';
import {
  IconUser, IconUsers, IconShieldCheck, IconTrophy, IconTarget, IconBooks, IconChevronDown, IconForms, IconCalendarEvent, IconNotes,
} from '@tabler/icons-react';

// Form sayfalarının (öğrenci ekle / düzenle, görüşme ekle) yeni tasarımı: renkli başlıklı kartlar.
// Kart: FORM_CARD_CLS sınıflı div; ilk çocuğu FormSectionTitle (kartın üst şeridi olur).

export const FORM_CARD_CLS = 'space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm';

export const formInputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

const THEMES = {
  violet: 'border-violet-100 from-violet-50 bg-violet-500',
  emerald: 'border-emerald-100 from-emerald-50 bg-emerald-500',
  sky: 'border-sky-100 from-sky-50 bg-sky-500',
  amber: 'border-amber-100 from-amber-50 bg-amber-500',
  rose: 'border-rose-100 from-rose-50 bg-rose-500',
  indigo: 'border-indigo-100 from-indigo-50 bg-indigo-500',
  teal: 'border-teal-100 from-teal-50 bg-teal-500',
} as const;

// Başlığa göre renk ve simge (öğrenci formlarındaki bölümler)
const BY_TITLE: Record<string, { theme: keyof typeof THEMES; icon: ReactNode; label: string }> = {
  'Temel Bilgiler': { theme: 'violet', icon: <IconUser size={16} />, label: 'Temel bilgiler' },
  'Aile Bilgileri': { theme: 'emerald', icon: <IconUsers size={16} />, label: 'Aile bilgileri' },
  'Veli Bilgileri': { theme: 'sky', icon: <IconShieldCheck size={16} />, label: 'Veli bilgileri' },
  'Önceki YKS Sonuçları': { theme: 'amber', icon: <IconTrophy size={16} />, label: 'Önceki YKS sonuçları' },
  Hedef: { theme: 'rose', icon: <IconTarget size={16} />, label: 'Hedef' },
  'Kullanılan Kaynaklar': { theme: 'indigo', icon: <IconBooks size={16} />, label: 'Kullanılan kaynaklar' },
  'Görüşme bilgileri': { theme: 'teal', icon: <IconCalendarEvent size={16} />, label: 'Görüşme bilgileri' },
  'Görüşme notları': { theme: 'emerald', icon: <IconNotes size={16} />, label: 'Görüşme notları' },
};

export function FormSectionTitle({ children, open, onToggle, hint }: {
  children: string;
  /** Açılır kapanır bölüm ise */
  open?: boolean;
  onToggle?: () => void;
  hint?: ReactNode;
}) {
  const meta = BY_TITLE[children] ?? { theme: 'violet' as const, icon: <IconForms size={16} />, label: children };
  const [border, from, chip] = THEMES[meta.theme].split(' ');
  const collapsed = onToggle && !open;
  const cls = `-mx-5 -mt-5 flex w-[calc(100%+2.5rem)] items-center gap-2.5 bg-gradient-to-r to-white px-5 py-3 text-left ${from} ${collapsed ? '-mb-5' : `border-b ${border}`}`;
  const inner = (
    <>
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white ${chip}`}>{meta.icon}</span>
      <span className="mr-auto">
        <span className="block text-[15px] font-semibold text-gray-900">{meta.label}</span>
        {hint && <span className="block text-[12px] text-gray-500">{hint}</span>}
      </span>
      {onToggle && (
        <span className="flex items-center gap-1 text-[12px] font-medium text-gray-500">
          {open ? 'Gizle' : 'Göster'}
          <IconChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      )}
    </>
  );
  return onToggle
    ? <button type="button" onClick={onToggle} className={cls}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

/** Sayfanın altında yapışkan kaydet çubuğu */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-16 z-10 -mx-1 rounded-2xl border border-[var(--border)] bg-white/95 p-2 shadow-lg backdrop-blur md:bottom-3">
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export const formCancelCls = 'flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-600 hover:bg-gray-50';
export const formSubmitCls = 'flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60';
