import { useState, useEffect, useCallback } from 'react';

export interface CookieConsent {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
}

const CONSENT_STORAGE_KEY = 'cookie-consent';
const CONSENT_VERSION = '1.0';

const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  timestamp: 0,
};

export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookieConsent;
        // Check version - if outdated, require new consent
        if (parsed.version === CONSENT_VERSION) {
          setConsentState(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading cookie consent:', error);
    }
    setIsLoaded(true);
  }, []);

  const setConsent = useCallback((newConsent: Partial<Omit<CookieConsent, 'essential' | 'version' | 'timestamp'>>) => {
    const fullConsent: CookieConsent = {
      essential: true,
      analytics: newConsent.analytics ?? false,
      marketing: newConsent.marketing ?? false,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    };
    
    setConsentState(fullConsent);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
  }, []);

  const acceptAll = useCallback(() => {
    setConsent({ analytics: true, marketing: true });
  }, [setConsent]);

  const rejectAll = useCallback(() => {
    setConsent({ analytics: false, marketing: false });
  }, [setConsent]);

  const hasConsented = consent !== null;
  const canLoadAnalytics = consent?.analytics ?? false;
  const canLoadMarketing = consent?.marketing ?? false;

  return {
    consent,
    isLoaded,
    hasConsented,
    canLoadAnalytics,
    canLoadMarketing,
    setConsent,
    acceptAll,
    rejectAll,
  };
}
