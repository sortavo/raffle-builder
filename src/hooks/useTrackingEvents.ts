import { useCallback, useMemo } from 'react';
import { useCookieConsent } from './useCookieConsent';

// Event types for e-commerce tracking
type TrackingEventType = 
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'lead'
  | 'page_view';

interface TrackingEventData {
  // Item data
  item_id?: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  
  // Transaction data
  transaction_id?: string;
  value?: number;
  
  // User data (hashed for privacy)
  user_email?: string;
  user_phone?: string;
  
  // Custom data
  [key: string]: unknown;
}

// Hash function for PII data (simple hash for Meta/TikTok)
function hashPII(value: string): string {
  const str = value.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function useTrackingEvents() {
  const { canLoadAnalytics, canLoadMarketing } = useCookieConsent();

  // Push to GTM dataLayer (handles both GA4 and GTM)
  const pushToDataLayer = useCallback((event: string, data: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Send to Meta Pixel
  const sendToMetaPixel = useCallback((event: string, data: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      const fbq = (window as any).fbq;
      
      // Map our events to Meta's standard events
      const metaEventMap: Record<string, string> = {
        'view_item': 'ViewContent',
        'add_to_cart': 'AddToCart',
        'begin_checkout': 'InitiateCheckout',
        'purchase': 'Purchase',
        'lead': 'Lead',
      };
      
      const metaEvent = metaEventMap[event];
      if (metaEvent) {
        fbq('track', metaEvent, {
          content_name: data.item_name,
          content_category: data.item_category,
          content_ids: data.item_id ? [data.item_id] : undefined,
          currency: data.currency || 'MXN',
          value: data.value || data.price,
          num_items: data.quantity,
        });
      }
    }
  }, []);

  // Send to TikTok Pixel
  const sendToTikTokPixel = useCallback((event: string, data: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && (window as any).ttq) {
      const ttq = (window as any).ttq;
      
      // Map our events to TikTok's standard events
      const tiktokEventMap: Record<string, string> = {
        'view_item': 'ViewContent',
        'add_to_cart': 'AddToCart',
        'begin_checkout': 'InitiateCheckout',
        'purchase': 'CompletePayment',
        'lead': 'SubmitForm',
      };
      
      const tiktokEvent = tiktokEventMap[event];
      if (tiktokEvent) {
        ttq.track(tiktokEvent, {
          content_name: data.item_name,
          content_category: data.item_category,
          content_id: data.item_id,
          currency: data.currency || 'MXN',
          value: data.value || data.price,
          quantity: data.quantity,
        });
      }
    }
  }, []);

  // Main tracking function
  const track = useCallback((eventType: TrackingEventType, data: TrackingEventData = {}) => {
    // Analytics events (GA4/GTM) - require analytics consent
    if (canLoadAnalytics) {
      pushToDataLayer(eventType, {
        ecommerce: {
          currency: data.currency || 'MXN',
          value: data.value || data.price,
          items: data.item_id ? [{
            item_id: data.item_id,
            item_name: data.item_name,
            item_category: data.item_category,
            price: data.price,
            quantity: data.quantity || 1,
          }] : undefined,
          transaction_id: data.transaction_id,
        },
        ...data,
      });
    }

    // Marketing pixels (Meta, TikTok) - require marketing consent
    if (canLoadMarketing) {
      sendToMetaPixel(eventType, data);
      sendToTikTokPixel(eventType, data);
    }
  }, [canLoadAnalytics, canLoadMarketing, pushToDataLayer, sendToMetaPixel, sendToTikTokPixel]);

  // Convenience methods for common events
  const trackViewItem = useCallback((params: {
    itemId: string;
    itemName: string;
    category?: string;
    price: number;
    currency?: string;
  }) => {
    track('view_item', {
      item_id: params.itemId,
      item_name: params.itemName,
      item_category: params.category || 'raffle',
      price: params.price,
      currency: params.currency || 'MXN',
    });
  }, [track]);

  const trackAddToCart = useCallback((params: {
    itemId: string;
    itemName: string;
    price: number;
    quantity: number;
    currency?: string;
  }) => {
    track('add_to_cart', {
      item_id: params.itemId,
      item_name: params.itemName,
      item_category: 'ticket',
      price: params.price,
      quantity: params.quantity,
      value: params.price * params.quantity,
      currency: params.currency || 'MXN',
    });
  }, [track]);

  const trackRemoveFromCart = useCallback((params: {
    itemId: string;
    itemName: string;
    price: number;
    quantity: number;
    currency?: string;
  }) => {
    track('remove_from_cart', {
      item_id: params.itemId,
      item_name: params.itemName,
      item_category: 'ticket',
      price: params.price,
      quantity: params.quantity,
      value: params.price * params.quantity,
      currency: params.currency || 'MXN',
    });
  }, [track]);

  const trackBeginCheckout = useCallback((params: {
    itemId: string;
    itemName: string;
    value: number;
    quantity: number;
    currency?: string;
  }) => {
    track('begin_checkout', {
      item_id: params.itemId,
      item_name: params.itemName,
      item_category: 'ticket',
      value: params.value,
      quantity: params.quantity,
      currency: params.currency || 'MXN',
    });
  }, [track]);

  const trackPurchase = useCallback((params: {
    transactionId: string;
    itemId: string;
    itemName: string;
    value: number;
    quantity: number;
    currency?: string;
    userEmail?: string;
    userPhone?: string;
  }) => {
    track('purchase', {
      transaction_id: params.transactionId,
      item_id: params.itemId,
      item_name: params.itemName,
      item_category: 'ticket',
      value: params.value,
      quantity: params.quantity,
      currency: params.currency || 'MXN',
      // Hash PII for privacy
      user_email_hash: params.userEmail ? hashPII(params.userEmail) : undefined,
      user_phone_hash: params.userPhone ? hashPII(params.userPhone) : undefined,
    });
  }, [track]);

  const trackLead = useCallback((params: {
    leadType: string;
    value?: number;
    currency?: string;
    userEmail?: string;
  }) => {
    track('lead', {
      lead_type: params.leadType,
      value: params.value,
      currency: params.currency || 'MXN',
      user_email_hash: params.userEmail ? hashPII(params.userEmail) : undefined,
    });
  }, [track]);

  return {
    track,
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackLead,
    // Expose consent state for conditional rendering
    canTrackAnalytics: canLoadAnalytics,
    canTrackMarketing: canLoadMarketing,
  };
}
