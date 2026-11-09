'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconMinus, IconX, IconMessages } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { GorusmeOgrenciClient } from '@/app/gorusmeler/[id]/GorusmeOgrenciClient';

// Öğrenci detayında görüşme paneli: sayfa kapanmadan yanda açık kalır.
// Koç görüşme notunu yazarken sekmelerde (denemeler, program, bilgiler…) gezebilir; panelde önceki görüşmeler de alt alta durur.
// Masaüstünde sağda sabit sütun, telefonda tam ekran; "Küçült" ile kapanmadan gizlenir (yazılanlar kaybolmaz).

export function GorusmePaneli({ student, minimized, onMinimize, onClose }: {
  student: { id: string; full_name: string; kurum?: string | null };
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[] | null>(null);

  useEffect(() => {
    let alive = true;
    (createClient() as any)
      .from('meetings')
      .select('*, created_by_profile:created_by(id, full_name)')
      .eq('student_id', student.id)
      .order('scheduled_at', { ascending: false })
      .then(({ data }: { data: any[] | null }) => { if (alive) setMeetings(data ?? []); });
    return () => { alive = false; };
  }, [student.id]);

  return (
    <aside
      className={`${minimized ? 'hidden' : 'flex'} fixed inset-0 z-50 flex-col bg-[var(--paper)] lg:sticky lg:top-2 lg:z-10 lg:h-[calc(100vh-1rem)] lg:w-[430px] lg:flex-shrink-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--border)] lg:shadow-lg`}
      aria-label="Görüşme kaydı"
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 px-4 py-3 text-white">
        <IconMessages size={18} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">Görüşme · {student.full_name}</p>
          <p className="text-[11px] text-white/85">Yazdıklarınız otomatik saklanır; sol tarafta öğrencinin bilgilerinde gezebilirsiniz.</p>
        </div>
        <button type="button" onClick={onMinimize} title="Küçült (yazılanlar kaybolmaz)" aria-label="Küçült"
          className="rounded-lg p-1.5 hover:bg-white/20">
          <IconMinus size={18} />
        </button>
        <button type="button" onClick={onClose} title="Kapat (taslak saklanır)" aria-label="Kapat"
          className="rounded-lg p-1.5 hover:bg-white/20">
          <IconX size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {meetings === null ? (
          <p className="p-4 text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
        ) : (
          <GorusmeOgrenciClient
            student={student}
            initialMeetings={meetings}
            variant="panel"
            onCreated={() => router.refresh()}
          />
        )}
      </div>
    </aside>
  );
}
