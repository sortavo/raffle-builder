import { useCallback } from 'react';
import { useCookieConsent } from './useCookieConsent';

type SortavoEventType = 
  | 'page_view'
  | 'view_content'
  | 'view_pricing'
  | 'view_features'
  | 'lead'
  | 'sign_up'
  | 'complete_registration'
  | 'start_trial'
  | 'subscribe'
  | 'purchase';

interface SortavoEventData {
  page_title?: string;
  page_path?: string;
  plan_name?: string;
  plan_price?: number;
  currency?: string;
  value?: number;
  [key: string]: unknown;
}

// Check if we're on the main Sortavo domain (not a client's custom domain)
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
  
  // Also include Lovable preview domains
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
    return true;
  }
  
  return sortavoDomains.includes(hostname);
}

// Get Sortavo's own pixel IDs from environment
function getSortavoPixelIds() {
  return {
    gtmId: import.meta.env.VITE_SORTAVO_GTM_ID || null,
    ga4Id: import.meta.env.VITE_SORTAVO_GA4_ID || null,
    metaPixelId: '1215706887335413', // Sortavo Meta Pixel - hardcoded for reliability
    tiktokPixelId: null, // TikTok disabled for now
  };
}

export function useSortavoTracking() {
  const { canLoadAnalytics, canLoadMarketing } = useCookieConsent();
  
  const isActive = isSortavoDomain();
  const pixelIds = getSortavoPixelIds();
  
  // Push to GTM dataLayer
  const pushToDataLayer = useCallback((eventName: string, data: Record<string, unknown> = {}) => {
    if (!canLoadAnalytics || !pixelIds.gtmId) return;
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }, [canLoadAnalytics, pixelIds.gtmId]);
  
  // Send to Meta Pixel
  const sendToMetaPixel = useCallback((eventName: string, data: Record<string, unknown> = {}) => {
    if (!canLoadMarketing || !pixelIds.metaPixelId) return;
    if (typeof window.fbq !== 'function') return;
    
    // Map to Meta standard events
    const metaEventMap: Record<string, string> = {
      'page_view': 'PageView',
      'view_content': 'ViewContent',
      'view_pricing': 'ViewContent',
      'view_features': 'ViewContent',
      'lead': 'Lead',
      'sign_up': 'CompleteRegistration',
      'complete_registration': 'CompleteRegistration',
      'start_trial': 'StartTrial',
      'subscribe': 'Subscribe',
      'purchase': 'Purchase',
    };
    
    const metaEvent = metaEventMap[eventName] || eventName;
    window.fbq('track', metaEvent, data);
  }, [canLoadMarketing, pixelIds.metaPixelId]);
  
  // Send to TikTok Pixel
  const sendToTikTokPixel = useCallback((eventName: string, data: Record<string, unknown> = {}) => {
    if (!canLoadMarketing || !pixelIds.tiktokPixelId) return;
    if (typeof window.ttq?.track !== 'function') return;
    
    // Map to TikTok standard events
    const tiktokEventMap: Record<string, string> = {
      'page_view': 'ViewContent',
      'view_content': 'ViewContent',
      'view_pricing': 'ViewContent',
      'view_features': 'ViewContent',
      'lead': 'SubmitForm',
      'sign_up': 'CompleteRegistration',
      'complete_registration': 'CompleteRegistration',
      'start_trial': 'Subscribe',
      'subscribe': 'Subscribe',
      'purchase': 'PlaceAnOrder',
    };
    
    const tiktokEvent = tiktokEventMap[eventName] || eventName;
    window.ttq.track(tiktokEvent, data);
  }, [canLoadMarketing, pixelIds.tiktokPixelId]);
  
  // Main track function
  const track = useCallback((eventType: SortavoEventType, data: SortavoEventData = {}) => {
    if (!isActive) return;
    
    const enrichedData = {
      ...data,
      page_path: data.page_path || window.location.pathname,
      page_title: data.page_title || document.title,
    };
    
    // Send to all platforms
    pushToDataLayer(eventType, enrichedData);
    sendToMetaPixel(eventType, enrichedData);
    sendToTikTokPixel(eventType, enrichedData);
  }, [isActive, pushToDataLayer, sendToMetaPixel, sendToTikTokPixel]);
  
  // Convenience methods
  const trackPageView = useCallback((pageName?: string) => {
    track('page_view', { page_title: pageName });
  }, [track]);
  
  const trackViewPricing = useCallback(() => {
    track('view_pricing', { content_category: 'pricing' });
  }, [track]);
  
  const trackViewFeatures = useCallback(() => {
    track('view_features', { content_category: 'features' });
  }, [track]);
  
  const trackLead = useCallback((source: string) => {
    track('lead', { lead_source: source });
  }, [track]);
  
  const trackSignUp = useCallback((method: string) => {
    track('sign_up', { method });
    track('complete_registration', { method });
  }, [track]);
  
  const trackStartTrial = useCallback((planName: string) => {
    track('start_trial', { plan_name: planName });
  }, [track]);
  
  const trackSubscribe = useCallback((planName: string, price: number, currency = 'USD') => {
    track('subscribe', { 
      plan_name: planName, 
      value: price, 
      currency,
    });
    track('purchase', { 
      plan_name: planName, 
      value: price, 
      currency,
    });
  }, [track]);
  
  return {
    isActive,
    pixelIds,
    track,
    trackPageView,
    trackViewPricing,
    trackViewFeatures,
    trackLead,
    trackSignUp,
    trackStartTrial,
    trackSubscribe,
    canTrackAnalytics: canLoadAnalytics,
    canTrackMarketing: canLoadMarketing,
  };
}
// Global tracking types are declared in src/types/tracking.d.ts
