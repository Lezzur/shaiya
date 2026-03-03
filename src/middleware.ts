import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect HTTP to HTTPS in production
  const proto = req.headers.get('x-forwarded-proto');
  if (proto === 'http' && process.env.NODE_ENV === 'production') {
    const httpsUrl = new URL(req.nextUrl.toString());
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // Public paths - no auth required
  if (
    pathname.startsWith('/(auth)') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/magic-link') ||
    pathname.startsWith('/(website)') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!session?.user) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = session.user.role;

  // Platform routes - require ADMIN or TEAM role
  if (pathname.startsWith('/(platform)') || pathname.startsWith('/platform')) {
    if (userRole !== 'ADMIN' && userRole !== 'TEAM') {
      return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Portal routes - require CLIENT role
  if (pathname.startsWith('/(portal)') || pathname.startsWith('/portal')) {
    if (userRole !== 'CLIENT') {
      return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // API routes (non-public) - require authentication
  if (pathname.startsWith('/api')) {
    // Already checked auth above, so user is authenticated
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
