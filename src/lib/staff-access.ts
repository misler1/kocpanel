// Kurum personeli (yurt yöneticisi / belletmen) erişim türü. Hem sunucu hem tarayıcı tarafında kullanılabilir.
// Veritabanı: supabase/yurt_personeli.sql (asıl kısıtlar veritabanı izinlerindedir; burası yalnızca ekranı sadeleştirir).

export type StaffKind = 'coach' | 'intern' | 'manager' | 'belletmen';

export type StaffAccess = { kind: StaffKind; mentorId: string | null; title: string | null };

export const STAFF_STATUS_LABEL: Record<string, string> = {
  dorm_manager: 'Yurt yöneticisi',
  dorm_supervisor: 'Belletmen',
};

export function kindFromStatus(status: string | null | undefined): StaffKind {
  if (status === 'dorm_manager') return 'manager';
  if (status === 'dorm_supervisor') return 'belletmen';
  if (status === 'intern') return 'intern';
  return 'coach';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStaffAccess(supabase: any, userId: string): Promise<StaffAccess> {
  const { data } = await supabase
    .from('teacher_access_profiles')
    .select('status, mentor_id, title')
    .eq('teacher_id', userId)
    .maybeSingle();
  return { kind: kindFromStatus(data?.status), mentorId: data?.mentor_id ?? null, title: data?.title ?? null };
}

/** Kurum personeline gösterilmeyen menüler (yönetim, anket, görüşme kayıtları, veli görüşmeleri, ayarlar) */
const HIDDEN_FOR_STAFF = ['/gorusmeler', '/anketler', '/veli-gorusmeleri', '/ayarlar', '/kazanim-havuzu'];

/** Belletmen: yalnızca giriş yaptığı sayfalar (sade menü) */
const BELLETMEN_NAV = ['/anasayfa', '/gunluk-giris', '/konu-ilerleyisi', '/denemeler', '/ajanda', '/mesajlar', '/hesabim'];
/** Yalnızca kurum personeline görünen menüler */
const STAFF_ONLY = ['/gunluk-giris'];

export function navAllowed(kind: StaffKind, href: string): boolean {
  if (kind === 'belletmen') return BELLETMEN_NAV.includes(href);
  if (STAFF_ONLY.includes(href) && kind !== 'manager') return false;
  if (kind === 'manager') {
    return !HIDDEN_FOR_STAFF.some((h) => href === h || href.startsWith(`${h}/`));
  }
  return true;
}

/** Öğrenci detayında görünen sekmeler */
export function allowedStudentTabs(kind: StaffKind): string[] | null {
  if (kind === 'belletmen') return ['program', 'denemeler'];
  if (kind === 'manager') return ['genel', 'bilgiler', 'program', 'denemeler'];
  return null; // hepsi
}
