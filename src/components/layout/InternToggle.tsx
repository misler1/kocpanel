'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useExamFilter } from '@/lib/exam-filter-context';

const COOKIE = 'show_interns';

export function InternToggle() {
  const router = useRouter();
  const { refreshOptions } = useExamFilter();
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
    refreshOptions();
    router.refresh();
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-gray-600">
      <input type="checkbox" checked={on} onChange={toggle} className="h-4 w-4 accent-blue-600" />
      Stajyerlerin öğrencileri
    </label>
  );
}