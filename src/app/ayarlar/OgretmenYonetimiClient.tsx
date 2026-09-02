'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OgretmenYonetimiClient({ teachers, currentUserId }: { teachers: any[]; currentUserId: string }) {
  const [list, setList] = useState(teachers);
  const supabase = createClient();

  async function toggleApprove(id: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any)
      .update({ is_approved: !current })
      .eq('id', id);
    setList((prev) => prev.map((t) => t.id === id ? { ...t, is_approved: !current } : t));
  }

  async function toggleAdmin(id: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any)
      .update({ is_admin: !current })
      .eq('id', id);
    setList((prev) => prev.map((t) => t.id === id ? { ...t, is_admin: !current } : t));
  }

  if (list.length === 0) {
    return <p className="px-4 py-4 text-[13px] text-gray-400">Henüz kayıtlı öğretmen yok.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {list.map((t) => {
        const isMe = t.id === currentUserId;
        const date = new Date(t.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-gray-900">{t.full_name}</span>
                {isMe && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">Sen</span>}
                {t.is_admin && <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">Admin</span>}
              </div>
                <div className="text-[11px] text-gray-400">{t.email}</div>
                <div className="text-[11px] text-gray-400">{date}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Onay butonu */}
              {!isMe && (
                <button
                  onClick={() => toggleApprove(t.id, t.is_approved)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    t.is_approved
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                      : 'bg-amber-100 text-amber-700 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  {t.is_approved ? 'Onaylı ✓' : 'Onayla'}
                </button>
              )}
              {/* Admin butonu */}
              {!isMe && (
                <button
                  onClick={() => toggleAdmin(t.id, t.is_admin)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    t.is_admin
                      ? 'bg-purple-100 text-purple-700 hover:bg-gray-100 hover:text-gray-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  {t.is_admin ? 'Admin ✓' : 'Admin yap'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}