import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { enforceOriginProtection } from '@/lib/edge/origin-guard';

export function middleware(request: NextRequest) {
  const result = enforceOriginProtection({
    pathname: request.nextUrl.pathname,
    headers: request.headers,
    env: process.env,
  });

  if (result.allowed) {
    return NextResponse.next();
  }

  return NextResponse.json({ ok: false, message: 'Direct origin access is not allowed.' }, { status: result.status });
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
