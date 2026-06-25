/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { IconPlus, IconUsersGroup } from '@tabler/icons-react';

export default async function VeliGorusmeleriPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: rawMeetings } = await (supabase as any)
    .from('meetings')
    .select('*, students(full_name, track)')
    .eq('coach_id', user.id)
    .eq('meeting_type', 'veli')
    .order('scheduled_at', { ascending: false });
  const meetings = (rawMeetings as any[]) ?? [];

  const upcoming = meetings.filter((m: any) => new Date(m.scheduled_at) >= new Date());
  const past = meetings.filter((m: any) => new Date(m.scheduled_at) < new Date());

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Veli görüşmeleri</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{meetings.length} veli görüşmesi</p>
        </div>
        <Link
          href="/gorusmeler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <IconPlus size={15} />
          Görüşme ekle
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-20">
          <IconUsersGroup size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">Henüz veli görüşmesi eklenmemiş.</p>
          <Link href="/gorusmeler/yeni" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Veli görüşmesi ekle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Yaklaşan</h2>
              <VeliList meetings={upcoming} />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-gray-400">Geçmiş</h2>
              <VeliList meetings={past} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function VeliList({ meetings }: { meetings: any[] }) {
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {meetings.map((m: any) => {
        const dt = new Date(m.scheduled_at);
        const dateStr = dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[11px] font-medium text-amber-700">VELİ</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-gray-900">{m.students?.full_name} — Veli</div>
              <div className="text-[12px] text-gray-500">{dateStr} · {timeStr} · {m.duration_minutes} dk</div>
              {m.topic && <div className="mt-0.5 text-[12px] text-gray-400">{m.topic}</div>}
            </div>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {m.completed ? 'Tamamlandı' : 'Bekliyor'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
