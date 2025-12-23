import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://eurodesignfrancepro.fr',
  'https://www.eurodesignfrancepro.fr',
  'https://app.eurodesignfrancepro.fr',
];

const PUBLIC_ROUTES = [
  '/',
  '/user/sign-in',
  '/user/sign-up',
  '/user/forgot-password',
  '/user/update-password',
];

const ADMIN_ROUTES = ['/admin'];

function detectSuspiciousRequest(request: NextRequest): boolean {
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';

  const suspiciousPatterns = [
    /\.\.\//,
    /<script/i,
    /union.*select/i,
    /eval\(/i,
    /exec\(/i,
    /\$\{.*\}/,
    /javascript:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(url) || pattern.test(userAgent));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (detectSuspiciousRequest(request)) {
    console.warn(`[SECURITY] Suspicious request blocked: ${request.url}`);
    return new NextResponse(JSON.stringify({ error: 'Request blocked' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[CORS] Blocked request from: ${origin}`);
      return new NextResponse(JSON.stringify({ error: 'CORS: Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }

  const { response, user, supabase } = await updateSession(request);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith('/api/')
  );

  if (!isPublicRoute && !user) {
    const signInUrl = new URL('/user/sign-in', request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (user && !isPublicRoute) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('confirmed, rejected, is_admin')
      .eq('user_id', user.id)
      .single();

    if ((profile as any)?.rejected) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/user/sign-in?error=rejected', request.url));
    }

    if (!(profile as any)?.confirmed && !pathname.startsWith('/user/')) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/user/sign-in?error=pending', request.url));
    }

    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
    if (isAdminRoute && !(profile as any)?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (user && (pathname === '/user/sign-in' || pathname === '/user/sign-up')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
