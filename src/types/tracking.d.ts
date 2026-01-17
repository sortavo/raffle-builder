/**
 * Global type declarations for third-party tracking scripts
 * These eliminate the need for `(window as any)` casts
 */

interface DataLayerEvent {
  event?: string;
  [key: string]: unknown;
}

interface FacebookPixel {
  (action: 'track' | 'trackCustom' | 'init', event: string, data?: Record<string, unknown>): void;
  (action: 'track' | 'trackCustom', event: string, data?: Record<string, unknown>): void;
}

interface TikTokPixel {
  track: (event: string, data?: Record<string, unknown>) => void;
  identify: (data: Record<string, unknown>) => void;
  page: () => void;
}

declare global {
  interface Window {
    // Google Tag Manager / Google Analytics
    dataLayer?: DataLayerEvent[];
    gtag?: (...args: unknown[]) => void;
    
    // Facebook/Meta Pixel
    fbq?: FacebookPixel;
    
    // TikTok Pixel
    ttq?: TikTokPixel;
  }
}

export {};
