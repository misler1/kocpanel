/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { OgrenciDetayClient } from './OgrenciDetayClient';
import { OgrenciArsivdenCikarButton } from './OgrenciArsivdenCikarButton';
import { VeliErisimPanel } from './VeliErisimPanel';
import { HedefNetPanel } from './HedefNetPanel';
import { HatirlatmaPanel } from './HatirlatmaPanel';
import { createAdminClient } from '@/lib/supabase/admin';
import { targetRows } from '@/lib/student-motivation';

export default async function OgrenciDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const { data: rawStudent } = await supabase
    .from('students').select('*').eq('id', id).eq('coach_id', user.id).single();

  const student = rawStudent as any;
  if (!student) notFound();

  const isArchived = student.status === 'pasif';

  const { data: rawMeetings } = await supabase
    .from('meetings').select('*, created_by_profile:created_by(id, full_name)').eq('student_id', id)
    .order('scheduled_at', { ascending: false }).limit(5);
  const { data: rawExams } = await supabase
    .from('exams').select('*').eq('student_id', id)
    .order('exam_date', { ascending: false }).limit(5);
  const { data: rawTasks } = await supabase
    .from('tasks').select('*').eq('student_id', id)
    .eq('completed', false).order('created_at', { ascending: false });
  // Hedef net satırları için tüm denemelerin yalnızca tür ve net bilgisi
  const { data: rawExamNets } = await supabase
    .from('exams').select('exam_type, exam_date, net_score').eq('student_id', id);
  const targets = targetRows(student.track, student.target_nets ?? {}, (rawExamNets as any[]) ?? []);
  // Öğrencinin telefon bildirimi açık mı (abonelikler yalnızca sunucudan okunur; tarayıcıya yalnızca evet/hayır gider)
  const { count: pushCount } = student.profile_id
    ? await (createAdminClient() as any).from('push_subscriptions')
      .select('id', { count: 'exact', head: true }).eq('user_id', student.profile_id)
    : { count: 0 };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={isArchived ? '/ogrenciler?arsiv=1' : '/ogrenciler'} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 text-[18px] font-medium text-gray-900">{student.full_name}</h1>
        {isArchived && <OgrenciArsivdenCikarButton studentId={id} />}
        <Link
          href={`/ogrenciler/${id}/duzenle`}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-50"
        >
          <IconEdit size={14} />
          Düzenle
        </Link>
      </div>

      <OgrenciDetayClient
        student={student}
        meetings={(rawMeetings as any[]) ?? []}
        exams={(rawExams as any[]) ?? []}
        tasks={(rawTasks as any[]) ?? []}
      />

      <div className="mt-3">
        <HedefNetPanel studentId={id} rows={targets} targetNets={student.target_nets ?? null} />
      </div>

      <div className="mt-3">
        <HatirlatmaPanel studentId={id} coachId={user.id} times={student.reminder_times ?? []}
          days={student.reminder_days ?? [0, 1, 2, 3, 4, 5, 6]} hasAccount={!!student.profile_id} pushOn={(pushCount ?? 0) > 0} />
      </div>

      <div className="mt-3">
        <VeliErisimPanel student={student} />
      </div>
    </div>
  );
}