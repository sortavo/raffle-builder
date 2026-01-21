// Centralized CORS configuration for all Edge Functions

const ALLOWED_ORIGINS = [
  'https://sortavo.com',
  'https://www.sortavo.com',
  'https://app.sortavo.com',
  'https://staging.sortavo.com',
  // Allow all subdomains of sortavo.com (tenant subdomains)
];

// Pattern for tenant subdomains
const SUBDOMAIN_PATTERN = /^https:\/\/[a-z0-9-]+\.sortavo\.com$/;

// Allow localhost in development
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  
  let allowedOrigin = '';
  
  // Check exact match first
  if (ALLOWED_ORIGINS.includes(origin)) {
    allowedOrigin = origin;
  }
  // Check subdomain pattern
  else if (SUBDOMAIN_PATTERN.test(origin)) {
    allowedOrigin = origin;
  }
  // Check lovable.app domains (preview environments)
  else if (origin.endsWith('.lovable.app')) {
    allowedOrigin = origin;
  }
  // Allow dev origins in development (check env)
  else if (DEV_ORIGINS.includes(origin)) {
    allowedOrigin = origin;
  }
  // For unknown HTTPS origins, use secure fallback
  // TODO: In the future, validate against verified custom_domains in DB
  else if (origin.startsWith('https://')) {
    // S4: Sanitize origin to prevent log injection attacks
    const sanitizedOrigin = origin
      .replace(/[\r\n\t]/g, '')  // Remove newlines/tabs
      .slice(0, 100);             // Limit length
    console.warn(`[CORS] Rejected unknown origin: ${sanitizedOrigin}`);
    allowedOrigin = ALLOWED_ORIGINS[0];
  }
  
  // If no match, use the first allowed origin as fallback
  if (!allowedOrigin) {
    allowedOrigin = ALLOWED_ORIGINS[0];
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Helper to handle CORS preflight
export function handleCorsPrelight(request: Request): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(request) 
  });
}

// Helper to create a JSON response with CORS headers
export function corsJsonResponse(
  request: Request, 
  data: unknown, 
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status,
      headers: { 
        ...getCorsHeaders(request), 
        'Content-Type': 'application/json' 
      }
    }
  );
}
