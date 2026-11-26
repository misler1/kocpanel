'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useExamFilter } from '@/lib/exam-filter-context';

const COOKIE = 'show_interns';

function cookieOn() {
  return typeof document !== 'undefined' && document.cookie.split('; ').includes(`${COOKIE}=1`);
}

function writeCookie(on: boolean) {
  document.cookie = on
    ? `${COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Stajyerlerin öğrencileri anahtarı yalnızca stajyerlerin çalıştığı kurum seçiliyken görünür
 * (ör. stajyer programı olan vakıf). Başka kurum ya da "Tüm kurumlar" seçilince gizlenir ve kapanır.
 * Deneme sonuçlarında gösterilmez: orada stajyerlerin öğrencileri her zaman listededir.
 */
export function InternToggle() {
  const pathname = usePathname();
  const { kurum } = useExamFilter();
  // null: henüz yüklenmedi; [] : stajyer yok
  const [internKurumlar, setInternKurumlar] = useState<string[] | null>(null);
  const [on, setOn] = useState(cookieOn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: interns } = await sb
        .from('teacher_access_profiles')
        .select('teacher_id')
        .eq('mentor_id', user.id)
        .neq('status', 'coach');
      const ids: string[] = (interns ?? []).map((i: { teacher_id: string }) => i.teacher_id);
      let kurumlar: string[] = [];
      if (ids.length) {
        const { data: st } = await sb.from('students').select('kurum').in('coach_id', ids).not('kurum', 'is', null);
        kurumlar = [...new Set<string>((st ?? []).map((s: { kurum: string }) => s.kurum.trim()).filter(Boolean))];
      }
      if (!cancelled) setInternKurumlar(ids.length ? kurumlar : []);
    })();
    return () => { cancelled = true; };
  }, []);

  const hasInterns = !!internKurumlar && internKurumlar.length > 0;
  const kurumOk = !!kurum && !!internKurumlar?.includes(kurum.trim());
  const visible = hasInterns && kurumOk && !pathname?.startsWith('/denemeler');

  // Anahtar açıkken stajyer kurumu dışına çıkılırsa kapat (deneme sayfası hariç; orada etkisi yok)
  useEffect(() => {
    if (internKurumlar === null || pathname?.startsWith('/denemeler')) return;
    if (on && !kurumOk) {
      writeCookie(false);
      // Filtre seçimi önce kaydedilsin, sonra sayfa yenilensin
      const t = setTimeout(() => window.location.reload(), 60);
      return () => clearTimeout(t);
    }
  }, [internKurumlar, kurumOk, on, pathname]);

  if (!visible) return null;

  function toggle() {
    const next = !on;
    writeCookie(next);
    setOn(next);
    // Sunucu sayfaları, menü sayacı ve filtreler yeni seçimle baştan yüklensin
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#D9E4F3] bg-white px-2.5 py-1.5">
      <span className="truncate text-xs text-[var(--ink-muted)]">Stajyerlerin öğrencileri</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-[var(--accent)]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
