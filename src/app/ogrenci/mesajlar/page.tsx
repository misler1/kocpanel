import { Suspense } from 'react';
import { getStudentContext } from '@/lib/student-context';
import { MessagesApp } from '@/components/messages/MessagesApp';

export default async function OgrenciMesajlarPage() {
  const { user } = await getStudentContext();
  return (
    <Suspense>
      <MessagesApp variant="student" meId={user.id} isStaff={false} />
    </Suspense>
  );
}
