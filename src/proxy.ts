import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['it', 'en', 'fr', 'es', 'pt', 'de', 'nl'];
const DEFAULT = 'it';

function detect(req: NextRequest): string {
  const cookie = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookie && LOCALES.includes(cookie)) return cookie;
  const h = req.headers.get('accept-language') || '';
  for (const part of h.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (LOCALES.includes(tag)) return tag;
  }
  return DEFAULT;
}

export function proxy(req: NextRequest) {
  const locale = detect(req);
  const res = NextResponse.next();
  if (!req.cookies.get('NEXT_LOCALE')) {
    res.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
  }
  return res;
}

export const config = { matcher: ['/((?!_next|api|favicon\\.ico).*)'] };
