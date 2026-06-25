/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { OgrenciDetayClient } from './OgrenciDetayClient';

export default async function OgrenciDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: rawStudent } = await supabase
    .from('students').select('*').eq('id', id).eq('coach_id', user.id).single();

  const student = rawStudent as any;
  if (!student) notFound();

  const { data: rawMeetings } = await supabase
    .from('meetings').select('*').eq('student_id', id)
    .order('scheduled_at', { ascending: false }).limit(5);
  const { data: rawExams } = await supabase
    .from('exams').select('*').eq('student_id', id)
    .order('exam_date', { ascending: false }).limit(5);
  const { data: rawTasks } = await supabase
    .from('tasks').select('*').eq('student_id', id)
    .eq('completed', false).order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/ogrenciler" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <IconArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 text-[18px] font-medium text-gray-900">{student.full_name}</h1>
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
    </div>
  );
}
