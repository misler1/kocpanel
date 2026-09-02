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

  const isAuthPage = request.nextUrl.pathname.startsWith('/giris') ||
                     request.nextUrl.pathname.startsWith('/kayit');
  const isWebhook = request.nextUrl.pathname.startsWith('/api/whatsapp');
  const isOnayPage = request.nextUrl.pathname.startsWith('/onay-bekleniyor');

  // Giriş yapmamış → giriş sayfasına
  if (!user && !isAuthPage && !isWebhook && !isOnayPage && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return NextResponse.redirect(url);
  }

  // Giriş yapmış + auth sayfasındaysa → onay kontrolü yap
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/anasayfa';
    return NextResponse.redirect(url);
  }

  // Giriş yapmış ama onay bekleniyor sayfası değilse → onay kontrolü
  if (user && !isAuthPage && !isWebhook && !isOnayPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single();

    if (profile && !profile.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = '/onay-bekleniyor';
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