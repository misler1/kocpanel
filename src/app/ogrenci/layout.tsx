import { StudentNav } from './StudentNav';

export default function OgrenciLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNav />
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">{children}</main>
    </div>
  );
}
