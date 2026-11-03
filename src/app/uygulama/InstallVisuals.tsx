import Image from 'next/image';
import {
  IconBook, IconBookmark, IconChevronLeft, IconChevronRight, IconCopy, IconDeviceDesktopDown, IconDeviceMobileDown,
  IconDotsVertical, IconEyeglass, IconHistory, IconLock, IconPlus, IconSettings, IconShare2, IconSquarePlus,
} from '@tabler/icons-react';

// Kurulum adımları için şematik telefon/tarayıcı çizimleri. Gerçek ekran görüntüsü değildir:
// dokunulacak yer pembe halkayla işaretlenir. iOS ve Android sürümleri arasında küçük görünüm farkları olabilir.

function Phone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`relative mx-auto h-[250px] w-[136px] overflow-hidden rounded-[24px] border-[5px] border-[#1D2B3A] ${dark ? 'bg-[#2B3442]' : 'bg-white'} shadow-md`}>
      <div className="absolute left-1/2 top-1 z-20 h-[9px] w-[44px] -translate-x-1/2 rounded-full bg-[#1D2B3A]" />
      {children}
    </div>
  );
}

/** Dokunulacak yer */
function Tap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span className="absolute -inset-1.5 animate-ping rounded-full bg-[#EC4899]/30" />
      <span className="absolute -inset-1.5 rounded-full ring-[2.5px] ring-[#EC4899]" />
      <span className="relative">{children}</span>
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-1.5 px-2.5 pt-6">
      <Image src="/brand/kocdefterim-logo.png" alt="" width={80} height={23} className="h-4 w-auto" />
      <div className="h-2 w-[85%] rounded bg-[#E8E5F1]" />
      <div className="h-2 w-[70%] rounded bg-[#E8E5F1]" />
      <div className="mt-2 h-12 rounded-lg bg-[#F3EEFF]" />
      <div className="h-2 w-[80%] rounded bg-[#E8E5F1]" />
      <div className="h-2 w-[60%] rounded bg-[#E8E5F1]" />
    </div>
  );
}

function AppIcon({ size = 30 }: { size?: number }) {
  return <Image src="/icon-192.png" alt="" width={size} height={size} className="rounded-[22%] shadow-sm" style={{ width: size, height: size }} />;
}

function HomeScreen() {
  return (
    <Phone dark>
      <div className="grid grid-cols-4 gap-2 px-2.5 pt-7">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[22%] bg-white/15" />
        ))}
        <div className="col-span-1 flex flex-col items-center">
          <Tap className="rounded-[22%]"><AppIcon size={25} /></Tap>
          <span className="mt-1.5 text-[6.5px] font-semibold text-white">KoçDefterim</span>
        </div>
      </div>
    </Phone>
  );
}

// ---------- iPhone ----------

export function IosSafari() {
  return (
    <Phone>
      <PageSkeleton />
      <div className="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-[#F6F6F8] px-2 pb-2 pt-1.5">
        <div className="mb-1.5 flex items-center justify-center gap-1 rounded-md bg-white py-1 text-[7px] text-gray-600">
          <IconLock size={7} /> kocdefterim.com.tr
        </div>
        <div className="flex items-center justify-between px-1 text-[#2F7CF6]">
          <IconChevronLeft size={13} />
          <IconChevronRight size={13} className="opacity-40" />
          <Tap><IconShare2 size={14} /></Tap>
          <IconBook size={13} />
          <IconCopy size={13} />
        </div>
      </div>
    </Phone>
  );
}

export function IosShareSheet() {
  const rows = [
    { icon: <IconCopy size={10} />, label: 'Kopyala' },
    { icon: <IconEyeglass size={10} />, label: 'Okuma Listesine Ekle' },
    { icon: <IconSquarePlus size={10} />, label: 'Ana Ekrana Ekle', tap: true },
    { icon: <IconBookmark size={10} />, label: 'Yer İşareti Ekle' },
  ];
  return (
    <Phone>
      <PageSkeleton />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-[#F2F2F7] px-2 pb-3 pt-2">
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-white p-1.5">
          <AppIcon size={16} />
          <span className="text-[7px] font-semibold text-gray-800">KoçDefterim</span>
        </div>
        <div className="overflow-hidden rounded-lg bg-white">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-gray-100 px-2 py-[5px] text-[7px] text-gray-800 last:border-0">
              {r.tap ? <Tap className="rounded-md px-1"><span className="font-bold">{r.label}</span></Tap> : <span>{r.label}</span>}
              <span className="text-gray-600">{r.icon}</span>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );
}

export function IosAddDialog() {
  return (
    <Phone>
      <div className="bg-[#F2F2F7] px-2 pb-3 pt-5">
        <div className="flex items-center justify-between text-[7px]">
          <span className="text-[#2F7CF6]">Vazgeç</span>
          <span className="font-semibold text-gray-900">Ana Ekrana Ekle</span>
          <Tap className="rounded-md px-0.5"><span className="font-bold text-[#2F7CF6]">Ekle</span></Tap>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-2">
          <AppIcon size={26} />
          <div className="min-w-0 flex-1">
            <div className="border-b border-gray-200 pb-0.5 text-[7.5px] font-semibold text-gray-900">KoçDefterim</div>
            <div className="mt-0.5 truncate text-[6px] text-gray-500">kocdefterim.com.tr</div>
          </div>
        </div>
      </div>
      <div className="px-2 pt-2"><div className="h-20 rounded-lg bg-gray-100" /></div>
    </Phone>
  );
}

// ---------- Android ----------

function ChromeBar({ tapMenu = false }: { tapMenu?: boolean }) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-1.5 pb-1.5 pt-4">
      <div className="flex flex-1 items-center gap-1 rounded-full bg-[#F1F3F4] px-1.5 py-1 text-[6.5px] text-gray-600">
        <IconLock size={7} /> kocdefterim.com.tr
      </div>
      {tapMenu ? <Tap><IconDotsVertical size={12} className="text-gray-700" /></Tap> : <IconDotsVertical size={12} className="text-gray-700" />}
    </div>
  );
}

export function AndroidChrome() {
  return (
    <Phone>
      <ChromeBar tapMenu />
      <PageSkeleton />
    </Phone>
  );
}

export function AndroidMenu() {
  const rows = [
    { icon: <IconPlus size={9} />, label: 'Yeni sekme' },
    { icon: <IconHistory size={9} />, label: 'Geçmiş' },
    { icon: <IconDeviceMobileDown size={9} />, label: 'Uygulamayı yükle', tap: true },
    { icon: <IconSettings size={9} />, label: 'Ayarlar' },
  ];
  return (
    <Phone>
      <ChromeBar />
      <PageSkeleton />
      <div className="absolute right-1 top-4 w-[92px] rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5 px-2 py-[5px] text-[6.5px] text-gray-800">
            <span className="text-gray-600">{r.icon}</span>
            {r.tap ? <Tap className="rounded-md px-0.5"><span className="font-bold">{r.label}</span></Tap> : r.label}
          </div>
        ))}
      </div>
    </Phone>
  );
}

export function AndroidDialog() {
  return (
    <Phone>
      <ChromeBar />
      <PageSkeleton />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-2 top-[38%] rounded-xl bg-white p-2.5">
        <div className="text-[8px] font-semibold text-gray-900">Uygulama yüklensin mi?</div>
        <div className="mt-2 flex items-center gap-1.5">
          <AppIcon size={20} />
          <div>
            <div className="text-[7px] font-semibold text-gray-900">KoçDefterim</div>
            <div className="text-[6px] text-gray-500">kocdefterim.com.tr</div>
          </div>
        </div>
        <div className="mt-2.5 flex justify-end gap-3 text-[7px] font-semibold text-[#1A73E8]">
          <span>İptal</span>
          <Tap className="rounded-md px-0.5"><span>Yükle</span></Tap>
        </div>
      </div>
    </Phone>
  );
}

// ---------- Bilgisayar ----------

export function DesktopBrowser() {
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border-[3px] border-[#1D2B3A] bg-white shadow-md">
      <div className="flex items-center gap-1.5 bg-[#E9EBEE] px-2 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
        <div className="ml-1 flex flex-1 items-center justify-between rounded-full bg-white px-2 py-1 text-[8px] text-gray-600">
          <span className="flex items-center gap-1"><IconLock size={8} /> kocdefterim.com.tr</span>
          <Tap><IconDeviceDesktopDown size={11} className="text-gray-700" /></Tap>
        </div>
      </div>
      <PageSkeleton />
      <div className="h-4" />
    </div>
  );
}

export { HomeScreen };
