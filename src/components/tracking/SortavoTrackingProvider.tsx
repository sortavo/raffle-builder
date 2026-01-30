import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTenant } from '@/contexts/TenantContext';
import {
  isValidGTMId,
  isValidGA4Id,
  isValidMetaPixelId,
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
    
    // GTM
    if (pixelIds.gtmId && isValidGTMId(pixelIds.gtmId)) {
      const existingGtm = document.querySelector(`script[data-sortavo-gtm]`);
      if (!existingGtm) {
        const gtmId = pixelIds.gtmId.trim().toUpperCase();
        const script = document.createElement('script');
        script.setAttribute('data-sortavo-gtm', 'true');
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
        document.head.appendChild(script);
        
        // Add noscript fallback
        const noscript = document.createElement('noscript');
        noscript.setAttribute('data-sortavo-gtm-noscript', 'true');
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
        iframe.height = '0';
        iframe.width = '0';
        iframe.style.display = 'none';
        iframe.style.visibility = 'hidden';
        noscript.appendChild(iframe);
        document.body.insertBefore(noscript, document.body.firstChild);
      }
    }
    
    // GA4 (if not using GTM)
    if (pixelIds.ga4Id && isValidGA4Id(pixelIds.ga4Id) && !pixelIds.gtmId) {
      const existingGa4 = document.querySelector(`script[data-sortavo-ga4]`);
      if (!existingGa4) {
        const ga4Id = pixelIds.ga4Id.trim().toUpperCase();
        
        // Load gtag.js
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
        gtagScript.setAttribute('data-sortavo-ga4', 'true');
        document.head.appendChild(gtagScript);
        
        // Initialize gtag
        const initScript = document.createElement('script');
        initScript.setAttribute('data-sortavo-ga4-init', 'true');
        initScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ga4Id}');
        `;
        document.head.appendChild(initScript);
      }
    }
  }, [shouldTrack, canLoadAnalytics, pixelIds.gtmId, pixelIds.ga4Id]);
  
  // Inject Meta and TikTok pixels (marketing)
  useEffect(() => {
    if (!shouldTrack || !canLoadMarketing) return;
    
    // Meta Pixel
    if (pixelIds.metaPixelId && isValidMetaPixelId(pixelIds.metaPixelId)) {
      const existingMeta = document.querySelector(`script[data-sortavo-meta]`);
      if (!existingMeta) {
        const metaId = pixelIds.metaPixelId.trim();
        const script = document.createElement('script');
        script.setAttribute('data-sortavo-meta', 'true');
        script.innerHTML = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaId}');
fbq('track', 'PageView');`;
        document.head.appendChild(script);
        
        // Add noscript pixel
        const noscript = document.createElement('noscript');
        noscript.setAttribute('data-sortavo-meta-noscript', 'true');
        const img = document.createElement('img');
        img.height = 1;
        img.width = 1;
        img.style.display = 'none';
        img.src = `https://www.facebook.com/tr?id=${metaId}&ev=PageView&noscript=1`;
        noscript.appendChild(img);
        document.head.appendChild(noscript);
      }
    }
    
    // TikTok Pixel (disabled for now)
  }, [shouldTrack, canLoadMarketing, pixelIds.metaPixelId, pixelIds.tiktokPixelId]);
  
  // This component doesn't render anything
  return null;
}
