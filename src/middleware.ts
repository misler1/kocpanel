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
    isPublicMarketingPath(pathname);

  const isWebhook = pathname.startsWith('/api/whatsapp');
  const isOnayPage = pathname.startsWith('/onay-bekleniyor');

  if (isPublicPage || isWebhook) {
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

  if (!user && !isAuthPage && !isOnayPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/anasayfa';
    return NextResponse.redirect(url);
  }

  if (user && !isAuthPage && !isOnayPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, is_admin')
      .eq('id', user.id)
      .single();

    if (profile && !profile.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = '/onay-bekleniyor';
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/kazanim-havuzu') && !profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/anasayfa';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
