import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTenant } from '@/contexts/TenantContext';
import {
  generateGTMScript,
  generateGTMNoScript,
  generateGA4Script,
  generateMetaPixelScript,
  generateTikTokPixelScript,
  isValidGTMId,
  isValidGA4Id,
  isValidMetaPixelId,
  isValidTikTokPixelId,
} from '@/lib/tracking-scripts';

// Get Sortavo's own pixel IDs - hardcoded for reliability
function getSortavoPixelIds() {
  return {
    gtmId: import.meta.env.VITE_SORTAVO_GTM_ID || null,
    ga4Id: 'G-N45GPVWM00', // Sortavo GA4 - hardcoded for reliability
    metaPixelId: '1215706887335413', // Sortavo Meta Pixel - hardcoded for reliability
    tiktokPixelId: null, // TikTok disabled for now
  };
}

// Check if we're on the main Sortavo domain
function isSortavoDomain(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Production Sortavo domains
  const sortavoDomains = [
    'sortavo.com',
    'www.sortavo.com',
    'sortavo.dev',
    'www.sortavo.dev',
  ];
  
  // Lovable preview domains
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
    return true;
  }
  
  return sortavoDomains.includes(hostname);
}

// Routes where Sortavo tracking should NOT be active (client-facing pages)
const EXCLUDED_ROUTES = [
  /^\/r\//, // Public raffle pages
  /^\/[^/]+\/[^/]+$/, // /:orgSlug/:raffleSlug pattern
  /^\/[^/]+\/[^/]+\/payment$/, // Payment pages
];

function isExcludedRoute(pathname: string): boolean {
  // Don't exclude main routes
  const mainRoutes = ['/', '/pricing', '/features', '/auth', '/contact', '/help', '/terms', '/privacy'];
  if (mainRoutes.includes(pathname)) return false;
  
  return EXCLUDED_ROUTES.some(pattern => pattern.test(pathname));
}

export function SortavoTrackingProvider() {
  const location = useLocation();
  const { canLoadAnalytics, canLoadMarketing, hasConsented } = useCookieConsent();
  const { tenant } = useTenant();
  
  const pixelIds = useMemo(() => getSortavoPixelIds(), []);
  
  // Determine if tracking should be active
  const shouldTrack = useMemo(() => {
    // Don't track if on a client's custom domain
    if (tenant) return false;
    
    // Don't track if not on Sortavo domain
    if (!isSortavoDomain()) return false;
    
    // Don't track on excluded routes
    if (isExcludedRoute(location.pathname)) return false;
    
    // Must have user consent
    if (!hasConsented) return false;
    
    return true;
  }, [tenant, location.pathname, hasConsented]);
  
  // Inject GTM and GA4 scripts (analytics)
  useEffect(() => {
    if (!shouldTrack || !canLoadAnalytics) return;
    
    const scriptsToInject: string[] = [];
    
    // GTM
    if (pixelIds.gtmId && isValidGTMId(pixelIds.gtmId)) {
      const existingGtm = document.querySelector(`script[data-sortavo-gtm]`);
      if (!existingGtm) {
        scriptsToInject.push(generateGTMScript(pixelIds.gtmId));
        
        // Add noscript fallback
        const noscript = document.createElement('noscript');
        noscript.setAttribute('data-sortavo-gtm-noscript', 'true');
        noscript.innerHTML = generateGTMNoScript(pixelIds.gtmId)
          .replace('<noscript>', '')
          .replace('</noscript>', '');
        document.body.insertBefore(noscript, document.body.firstChild);
      }
    }
    
    // GA4 (if not using GTM)
    if (pixelIds.ga4Id && isValidGA4Id(pixelIds.ga4Id) && !pixelIds.gtmId) {
      const existingGa4 = document.querySelector(`script[data-sortavo-ga4]`);
      if (!existingGa4) {
        scriptsToInject.push(generateGA4Script(pixelIds.ga4Id));
      }
    }
    
    // Inject analytics scripts
    scriptsToInject.forEach((scriptContent, index) => {
      const script = document.createElement('script');
      script.setAttribute('data-sortavo-analytics', `${index}`);
      script.innerHTML = scriptContent;
      document.head.appendChild(script);
    });
  }, [shouldTrack, canLoadAnalytics, pixelIds.gtmId, pixelIds.ga4Id]);
  
  // Inject Meta and TikTok pixels (marketing)
  useEffect(() => {
    if (!shouldTrack || !canLoadMarketing) return;
    
    // Meta Pixel
    if (pixelIds.metaPixelId && isValidMetaPixelId(pixelIds.metaPixelId)) {
      const existingMeta = document.querySelector(`script[data-sortavo-meta]`);
      if (!existingMeta) {
        const script = document.createElement('script');
        script.setAttribute('data-sortavo-meta', 'true');
        script.innerHTML = generateMetaPixelScript(pixelIds.metaPixelId);
        document.head.appendChild(script);
      }
    }
    
    // TikTok Pixel
    if (pixelIds.tiktokPixelId && isValidTikTokPixelId(pixelIds.tiktokPixelId)) {
      const existingTiktok = document.querySelector(`script[data-sortavo-tiktok]`);
      if (!existingTiktok) {
        const script = document.createElement('script');
        script.setAttribute('data-sortavo-tiktok', 'true');
        script.innerHTML = generateTikTokPixelScript(pixelIds.tiktokPixelId);
        document.head.appendChild(script);
      }
    }
  }, [shouldTrack, canLoadMarketing, pixelIds.metaPixelId, pixelIds.tiktokPixelId]);
  
  // This component doesn't render anything
  return null;
}
