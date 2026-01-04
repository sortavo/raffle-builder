/**
 * Tracking Scripts Generator
 * Generates and sanitizes tracking scripts for custom domains (Pro+ plans)
 */

export interface TrackingConfig {
  gtm: string | null;
  metaPixel: string | null;
  ga4: string | null;
  tiktok: string | null;
  custom: string | null;
}

// Validation patterns
const GTM_PATTERN = /^GTM-[A-Z0-9]{6,8}$/i;
const META_PIXEL_PATTERN = /^\d{15,16}$/;
const GA4_PATTERN = /^G-[A-Z0-9]{10,12}$/i;
const TIKTOK_PATTERN = /^\d{10,20}$/;

/**
 * Validate GTM Container ID format
 */
export function isValidGTMId(id: string): boolean {
  return GTM_PATTERN.test(id.trim());
}

/**
 * Validate Meta Pixel ID format
 */
export function isValidMetaPixelId(id: string): boolean {
  return META_PIXEL_PATTERN.test(id.trim());
}

/**
 * Validate GA4 Measurement ID format
 */
export function isValidGA4Id(id: string): boolean {
  return GA4_PATTERN.test(id.trim());
}

/**
 * Validate TikTok Pixel ID format
 */
export function isValidTikTokPixelId(id: string): boolean {
  return TIKTOK_PATTERN.test(id.trim());
}

/**
 * Sanitize custom scripts to prevent XSS
 */
export function sanitizeCustomScript(script: string): string {
  if (!script) return '';
  
  return script
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\bon\w+\s*=/gi, '')
    // Remove eval and Function constructor
    .replace(/eval\s*\(/gi, '')
    .replace(/new\s+Function\s*\(/gi, '')
    // Block direct cookie/storage access patterns
    .replace(/document\.cookie(?!\s*tracking)/gi, '')
    .replace(/localStorage\s*\./gi, '')
    .replace(/sessionStorage\s*\./gi, '')
    // Remove potentially dangerous data: URLs in src attributes
    .replace(/src\s*=\s*["']?\s*data:/gi, 'src="blocked:');
}

/**
 * Generate Google Tag Manager script
 */
export function generateGTMScript(containerId: string): string {
  if (!containerId || !isValidGTMId(containerId)) return '';
  
  const id = containerId.trim().toUpperCase();
  
  return `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->
`;
}

/**
 * Generate GTM noscript for body (optional, for complete GTM setup)
 */
export function generateGTMNoScript(containerId: string): string {
  if (!containerId || !isValidGTMId(containerId)) return '';
  
  const id = containerId.trim().toUpperCase();
  
  return `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
`;
}

/**
 * Generate Meta/Facebook Pixel script
 */
export function generateMetaPixelScript(pixelId: string): string {
  if (!pixelId || !isValidMetaPixelId(pixelId)) return '';
  
  const id = pixelId.trim();
  
  return `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->
`;
}

/**
 * Generate Google Analytics 4 script
 */
export function generateGA4Script(measurementId: string): string {
  if (!measurementId || !isValidGA4Id(measurementId)) return '';
  
  const id = measurementId.trim().toUpperCase();
  
  return `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>
<!-- End Google Analytics 4 -->
`;
}

/**
 * Generate TikTok Pixel script
 */
export function generateTikTokPixelScript(pixelId: string): string {
  if (!pixelId || !isValidTikTokPixelId(pixelId)) return '';
  
  const id = pixelId.trim();
  
  return `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${id}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->
`;
}

/**
 * Generate all tracking scripts combined
 */
export function generateAllTrackingScripts(config: TrackingConfig): string {
  const scripts: string[] = [];
  
  if (config.gtm) {
    scripts.push(generateGTMScript(config.gtm));
  }
  
  if (config.metaPixel) {
    scripts.push(generateMetaPixelScript(config.metaPixel));
  }
  
  if (config.ga4) {
    scripts.push(generateGA4Script(config.ga4));
  }
  
  if (config.tiktok) {
    scripts.push(generateTikTokPixelScript(config.tiktok));
  }
  
  if (config.custom) {
    const sanitized = sanitizeCustomScript(config.custom);
    if (sanitized.trim()) {
      scripts.push(`
<!-- Custom Tracking Scripts -->
${sanitized}
<!-- End Custom Tracking Scripts -->
`);
    }
  }
  
  return scripts.filter(Boolean).join('\n');
}

/**
 * Get validation message for a tracking ID
 */
export function getValidationMessage(type: 'gtm' | 'metaPixel' | 'ga4' | 'tiktok', value: string): string | null {
  if (!value || value.trim() === '') return null;
  
  switch (type) {
    case 'gtm':
      return isValidGTMId(value) ? null : 'Formato inválido. Ejemplo: GTM-XXXXXX';
    case 'metaPixel':
      return isValidMetaPixelId(value) ? null : 'Debe ser un ID numérico de 15-16 dígitos';
    case 'ga4':
      return isValidGA4Id(value) ? null : 'Formato inválido. Ejemplo: G-XXXXXXXXXX';
    case 'tiktok':
      return isValidTikTokPixelId(value) ? null : 'Debe ser un ID numérico';
    default:
      return null;
  }
}
