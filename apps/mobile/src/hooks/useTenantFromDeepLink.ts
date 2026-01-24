// Hook to extract tenant from deep links
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useDeepLinkTenant } from '@sortavo/sdk/react-native';

interface TenantState {
  tenantId: string | null;
  tenantSlug: string | null;
  rafflePath: string | null;
  isLoading: boolean;
}

// Map of known tenant slugs to IDs
// In production, this would be fetched from the API
const TENANT_MAP: Record<string, string> = {
  // Add your tenants here
  // 'my-org': 'uuid-of-org'
};

export function useTenantFromDeepLink(): TenantState {
  const [state, setState] = useState<TenantState>({
    tenantId: null,
    tenantSlug: null,
    rafflePath: null,
    isLoading: true,
  });

  useEffect(() => {
    async function getInitialURL() {
      // Get initial URL that opened the app
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        const { tenantSlug, rafflePath } = parseDeepLink(initialUrl);

        if (tenantSlug) {
          // Look up tenant ID from slug
          const tenantId = TENANT_MAP[tenantSlug] || tenantSlug;
          setState({
            tenantId,
            tenantSlug,
            rafflePath,
            isLoading: false,
          });
          return;
        }
      }

      // No deep link, use default tenant or prompt selection
      setState({
        tenantId: null,
        tenantSlug: null,
        rafflePath: null,
        isLoading: false,
      });
    }

    getInitialURL();

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      const { tenantSlug, rafflePath } = parseDeepLink(event.url);

      if (tenantSlug) {
        const tenantId = TENANT_MAP[tenantSlug] || tenantSlug;
        setState({
          tenantId,
          tenantSlug,
          rafflePath,
          isLoading: false,
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return state;
}

function parseDeepLink(url: string): { tenantSlug: string | null; rafflePath: string | null } {
  try {
    const parsed = Linking.parse(url);

    // Handle custom scheme: sortavo://tenant-slug/path
    if (parsed.scheme === 'sortavo') {
      const pathParts = (parsed.path || '').split('/').filter(Boolean);
      return {
        tenantSlug: parsed.hostname || pathParts[0] || null,
        rafflePath: pathParts.slice(parsed.hostname ? 0 : 1).join('/') || null,
      };
    }

    // Handle web URL: https://sortavo.com/t/tenant-slug/path
    if (parsed.path?.startsWith('/t/')) {
      const pathParts = parsed.path.slice(3).split('/');
      return {
        tenantSlug: pathParts[0] || null,
        rafflePath: pathParts.slice(1).join('/') || null,
      };
    }

    // Handle subdomain: https://tenant-slug.sortavo.com/path
    if (parsed.hostname?.endsWith('.sortavo.com')) {
      const subdomain = parsed.hostname.replace('.sortavo.com', '');
      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        return {
          tenantSlug: subdomain,
          rafflePath: parsed.path || null,
        };
      }
    }

    return { tenantSlug: null, rafflePath: null };
  } catch (e) {
    console.warn('Failed to parse deep link:', e);
    return { tenantSlug: null, rafflePath: null };
  }
}
