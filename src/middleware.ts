import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_MARKETING_PREFIXES = [
  '/hakkimizda',
  '/koclarimiz',
  '/hizmetlerimiz',
  '/yks',
  '/lgs',
  '/dil-sinav-koclugu',
  '/diger-sinavlar',
];

// /sifre-sifirla sayfasıyla aynı ad (orada tarayıcıda yazılıyor)
const RECOVERY_COOKIE = 'pw_recovery';

function isPublicMarketingPath(pathname: string) {
  return PUBLIC_MARKETING_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith('/giris') ||
    (pathname.startsWith('/kayit') && !pathname.startsWith('/kayit-formu')) ||
    pathname.startsWith('/sifremi-unuttum') ||
    pathname.startsWith('/sifre-sifirla');

  const isPublicPage =
    pathname.startsWith('/anket') ||
    pathname.startsWith('/kayit-formu') ||
    pathname === '/api/ogrenci/kayit' ||
    pathname === '/api/ogrenci/kocler' ||
    // Arama motoru dosyaları: oturumsuz istekte /giris'e yönlenirse Google robots/sitemap okuyamaz
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    /^\/google[0-9a-f]+\.html$/.test(pathname) ||
    isPublicMarketingPath(pathname);

  const isOnayPage = pathname.startsWith('/onay-bekleniyor');
  const isResetPage = pathname.startsWith('/sifre-sifirla');
  // Şifre sıfırlama linkiyle açılan oturum: yeni şifre belirlenene kadar yalnızca /sifre-sifirla kullanılabilir.
  const recoveryPending = request.cookies.get(RECOVERY_COOKIE)?.value === '1';

  if (isPublicPage) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && recoveryPending) {
    // Oturum kapanmış: bayrak artık geçersiz (aynı tarayıcıda giriş yapacak başka kullanıcıyı etkilemesin)
    response.cookies.delete(RECOVERY_COOKIE);
  }

  if (!user && !isAuthPage && !isOnayPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, is_admin, role')
      .eq('id', user.id)
      .single();

    if (recoveryPending && !isResetPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/sifre-sifirla';
      url.search = '';
      return NextResponse.redirect(url);
    }

    const isStudent = profile?.role === 'ogrenci';
    const isStudentArea = pathname === '/ogrenci' || pathname.startsWith('/ogrenci/') || pathname.startsWith('/api/ogrenci/');

    // Giriş yapmış kullanıcı giriş/kayıt sayfasına gelirse rolüne göre yönlendir
    if (isAuthPage && !isResetPage) {
      const url = request.nextUrl.clone();
      url.pathname = isStudent ? '/ogrenci' : '/anasayfa';
      return NextResponse.redirect(url);
    }

    if (!isOnayPage && !isResetPage) {
      // Profili olmayan hesap (ör. kayıt yarıda kaldı ya da API ile doğrudan açıldı) onaylı sayılmaz
      if (!profile || !profile.is_approved) {
        const url = request.nextUrl.clone();
        url.pathname = '/onay-bekleniyor';
        return NextResponse.redirect(url);
      }

      // Öğrenci yalnızca öğrenci alanına girebilir (koç sayfaları ve koç API'leri kapalı)
      if (isStudent && !isStudentArea && pathname !== '/') {
        const url = request.nextUrl.clone();
        url.pathname = '/ogrenci';
        return NextResponse.redirect(url);
      }

      // Koç/öğretmen öğrenci sayfalarına girmesin (öğrenci hesap-oluştur API'si koç içindir)
      if (!isStudent && (pathname === '/ogrenci' || pathname.startsWith('/ogrenci/'))) {
        const url = request.nextUrl.clone();
        url.pathname = '/anasayfa';
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/kazanim-havuzu') && !profile?.is_admin) {
        const url = request.nextUrl.clone();
        url.pathname = '/anasayfa';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
