import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// DISABLED: Middleware causes too many auth requests and hits rate limits
// Auth protection is now handled in the admin layout component
export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
