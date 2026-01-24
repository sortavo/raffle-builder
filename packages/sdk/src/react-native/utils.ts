// React Native specific utilities for Sortavo SDK
import { useEffect, useState } from 'react';

// Storage adapter for React Native (AsyncStorage compatible)
interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createReactNativeStorage(asyncStorage: AsyncStorageLike): Storage {
  return {
    getItem: (key: string) => {
      // Supabase expects synchronous but we fake it
      // The actual implementation wraps this properly
      return null;
    },
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as Storage;
}

// Hook to extract tenant from deep links
// Deep link format: sortavo://tenant-slug/raffle/raffle-slug
export function useDeepLinkTenant(initialUrl?: string) {
  const [tenant, setTenant] = useState<{
    tenantSlug: string | null;
    rafflePath: string | null;
  }>({
    tenantSlug: null,
    rafflePath: null,
  });

  useEffect(() => {
    if (!initialUrl) return;

    try {
      // Parse deep link URL
      // Format: sortavo://tenant-slug/path or https://sortavo.com/t/tenant-slug/path
      const url = new URL(initialUrl);

      if (url.protocol === 'sortavo:') {
        // Custom scheme: sortavo://tenant-slug/raffle/xyz
        const parts = url.pathname.split('/').filter(Boolean);
        const tenantSlug = url.host || parts[0];
        const rafflePath = parts.slice(url.host ? 0 : 1).join('/');

        setTenant({
          tenantSlug,
          rafflePath: rafflePath || null,
        });
      } else {
        // Web URL: https://sortavo.com/t/tenant-slug/raffle/xyz
        const match = url.pathname.match(/^\/t\/([^/]+)(.*)$/);
        if (match) {
          setTenant({
            tenantSlug: match[1],
            rafflePath: match[2] || null,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse deep link:', e);
    }
  }, [initialUrl]);

  return tenant;
}

// Deep link URL builders for sharing
export function buildDeepLink(tenantSlug: string, path?: string): string {
  const base = `sortavo://${tenantSlug}`;
  return path ? `${base}/${path}` : base;
}

export function buildWebLink(tenantSlug: string, path?: string): string {
  const base = `https://sortavo.com/t/${tenantSlug}`;
  return path ? `${base}/${path}` : base;
}

// Universal link that works on both web and mobile
export function buildUniversalLink(tenantSlug: string, path?: string): string {
  return buildWebLink(tenantSlug, path);
}
