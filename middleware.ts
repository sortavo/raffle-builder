import { NextRequest, NextResponse } from 'next/server';

// Subdomains that are NOT tenants (pass through directly)
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'staging', 'dev'];

// Your root domain (without www)
const ROOT_DOMAIN = 'sortavo.com';

export const config = {
  matcher: [
    // Match all paths except static files, api routes, and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Remove port for local development
  const host = hostname.replace(/:\d+$/, '');
  
  // Skip if it's localhost or preview deployments
  if (
    host === 'localhost' ||
    host.includes('127.0.0.1') ||
    host.includes('.vercel.app') ||
    host.includes('lovable.app')
  ) {
    return NextResponse.next();
  }
  
  // Check if it's a subdomain of our root domain
  const isSubdomain = host.endsWith(`.${ROOT_DOMAIN}`);
  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  
  // If it's the root domain or www, pass through
  if (isRootDomain) {
    return NextResponse.next();
  }
  
  // If it's a subdomain, extract and validate
  if (isSubdomain) {
    // Extract subdomain: "cliente1.sortavo.com" -> "cliente1"
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '');
    
    // Skip reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return NextResponse.next();
    }
    
    // Valid tenant subdomain - rewrite to /:orgSlug path
    const originalPath = url.pathname;
    
    // If already starts with the orgSlug, don't double-add
    if (originalPath.startsWith(`/${subdomain}`)) {
      return NextResponse.next();
    }
    
    // Rewrite: cliente1.sortavo.com/raffle1 -> /cliente1/raffle1
    url.pathname = `/${subdomain}${originalPath}`;
    
    return NextResponse.rewrite(url);
  }
  
  // Custom domain (not a subdomain of sortavo.com)
  // Pass through - TenantContext will handle detection
  return NextResponse.next();
}
