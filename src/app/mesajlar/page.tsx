import { IconMessageCircle } from '@tabler/icons-react';

export default function MesajlarPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-[18px] font-medium text-gray-900">Mesajlar</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Öğrenci ve öğretmenlerle iletişim</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white py-24">
        <IconMessageCircle size={40} className="text-gray-200" />
        <p className="text-[15px] font-medium text-gray-500">Mesajlaşma özelliği hazırlanıyor</p>
        <p className="text-[13px] text-gray-400 text-center max-w-xs">
          Koç-öğrenci ve koç-öğretmen mesajlaşması yakında aktif olacak.
          Gerçek zamanlı bildirimler Supabase Realtime ile çalışacak.
        </p>
      </div>
    </div>
  );
}
