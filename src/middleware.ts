import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith('/giris') ||
    (pathname.startsWith('/kayit') && !pathname.startsWith('/kayit-formu')) ||
    pathname.startsWith('/sifremi-unuttum') ||
    pathname.startsWith('/sifre-sifirla');

  const isPublicPage =
    pathname.startsWith('/anket') ||
    pathname.startsWith('/kayit-formu');

  const isWebhook = pathname.startsWith('/api/whatsapp');
  const isOnayPage = pathname.startsWith('/onay-bekleniyor');

  // Giriş yapmamış → giriş sayfasına
  if (!user && !isAuthPage && !isWebhook && !isOnayPage && !isPublicPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return NextResponse.redirect(url);
  }

  // Giriş yapmış + auth sayfasındaysa → anasayfaya
  if (user && isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/anasayfa';
    return NextResponse.redirect(url);
  }

  // Giriş yapmış ama onay bekleniyor sayfası değilse → onay kontrolü
  if (user && !isAuthPage && !isWebhook && !isOnayPage && !isPublicPage) {
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

    // Kazanım havuzu sadece yöneticiye açık
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