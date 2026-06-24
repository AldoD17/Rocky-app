import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const password = formData.get('password')?.toString() ?? '';
  const secret = process.env.ROCKY_ADMIN_SECRET;

  if (!secret || password !== secret) {
    return NextResponse.redirect(new URL('/admin/login?error=1', req.url));
  }

  const res = NextResponse.redirect(new URL('/admin', req.url));
  res.cookies.set('rocky_admin_session', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
