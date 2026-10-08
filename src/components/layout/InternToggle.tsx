'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const COOKIE = 'show_interns';

export function InternToggle() {
  const [hasInterns, setHasInterns] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.cookie.split('; ').includes(`${COOKIE}=1`));
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('teacher_access_profiles')
        .select('teacher_id', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .neq('status', 'coach');
      setHasInterns((count ?? 0) > 0);
    })();
  }, []);

  if (!hasInterns) return null;

  function toggle() {
    const next = !on;
    document.cookie = next
      ? `${COOKIE}=1; path=/; max-age=31536000; samesite=lax`
      : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
    setOn(next);
    // Sunucu sayfaları, menü sayacı ve filtreler yeni seçimle baştan yüklensin
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
      <span className="truncate text-xs text-white/70">Stajyerlerin öğrencileri</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-[var(--accent)]' : 'bg-white/20'
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