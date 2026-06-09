import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  // Check if session cookie exists
  const session = request.cookies.get('session');

  const path = request.nextUrl.pathname;

  // Only protect the actual exam pages and results/mistakes pages
  const isProtected = (
    path === '/tgat1' ||
    path === '/tgat2' ||
    path === '/tgat3' ||
    path === '/mock-exam' || path.startsWith('/mock-exam/') ||
    path.startsWith('/my-mistakes') ||
    path.startsWith('/results')
  );

  // If path is protected and there is no session, redirect to login page
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See Next.js Middleware docs: match all request paths except static ones
export const config = {
  matcher: [
    '/tgat1/:path*',
    '/tgat2/:path*',
    '/tgat3/:path*',
    '/mock-exam/:path*',
    '/my-mistakes/:path*',
    '/results/:path*',
  ],
};
