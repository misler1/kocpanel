'use client';

import { useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kindFromStatus, type StaffKind } from '@/lib/staff-access';

// Giriş yapan kullanıcının personel türü (koç / yurt yöneticisi / belletmen). Sol menü ve alt menü aynı değeri
// paylaşır; veritabanına sayfa başına bir kez sorulur.

let kind: StaffKind = 'coach';
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  const supabase = createClient();
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('teacher_access_profiles').select('status').eq('teacher_id', user.id).maybeSingle();
    kind = kindFromStatus(data?.status);
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
}

export function useStaffKind(): StaffKind {
  return useSyncExternalStore(subscribe, () => kind, () => 'coach');
}
