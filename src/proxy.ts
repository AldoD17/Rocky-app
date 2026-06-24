import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['it', 'en', 'fr', 'es', 'pt', 'de', 'nl'];
const DEFAULT = 'it';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin routes (except the login page itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = req.cookies.get('rocky_admin_session')?.value;
    const secret = process.env.ROCKY_ADMIN_SECRET;
    if (!secret || session !== secret) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // Locale cookie for non-admin, non-api routes
  if (!pathname.startsWith('/api') && !pathname.startsWith('/admin') && !req.cookies.has('NEXT_LOCALE')) {
    const h = req.headers.get('accept-language') || '';
    let locale = DEFAULT;
    for (const part of h.split(',')) {
      const tag = part.split(';')[0].trim().toLowerCase().split('-')[0];
      if (LOCALES.includes(tag)) { locale = tag; break; }
    }
    const res = NextResponse.next();
    res.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|api|favicon\\.ico).*)'] };
