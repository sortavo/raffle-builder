/**
 * MIDDLEWARE DESHABILITADO TEMPORALMENTE
 * 
 * Este middleware usa imports de next/server que no son compatibles
 * con proyectos Vite desplegados en Vercel.
 * 
 * La detección de subdominios se maneja en TenantContext.tsx
 * que funciona correctamente en el cliente.
 * 
 * Para habilitar middleware en Vercel con Vite, se requiere
 * usar Vercel Edge Functions nativas (archivo en /api/_middleware.ts)
 * o convertir el proyecto a Next.js.
 * 
 * Escenarios manejados por TenantContext:
 * - cliente1.sortavo.com -> detecta subdomain "cliente1"
 * - cliente1.com -> detecta custom domain
 * - sortavo.com -> no aplica tenant
 */

/*
import { NextRequest, NextResponse } from 'next/server';

const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'staging', 'dev'];
const ROOT_DOMAIN = 'sortavo.com';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const host = hostname.replace(/:\d+$/, '');
  
  if (
    host === 'localhost' ||
    host.includes('127.0.0.1') ||
    host.includes('.vercel.app') ||
    host.includes('lovable.app')
  ) {
    return NextResponse.next();
  }
  
  const isSubdomain = host.endsWith(`.${ROOT_DOMAIN}`);
  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  
  if (isRootDomain) {
    return NextResponse.next();
  }
  
  if (isSubdomain) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '');
    
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return NextResponse.next();
    }
    
    const originalPath = url.pathname;
    
    if (originalPath.startsWith(`/${subdomain}`)) {
      return NextResponse.next();
    }
    
    url.pathname = `/${subdomain}${originalPath}`;
    
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}
*/
