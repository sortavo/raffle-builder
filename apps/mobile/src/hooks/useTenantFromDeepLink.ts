// Hook to extract tenant from deep links
import { useEffect, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useDeepLinkTenant } from '@sortavo/sdk/react-native';

interface TenantState {
  tenantId: string | null;
  tenantSlug: string | null;
  rafflePath: string | null;
  isLoading: boolean;
  error: string | null;
}

// Validation constants
const MAX_SLUG_LENGTH = 50;
const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

// Reserved slugs that cannot be used as tenant identifiers
const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'login',
  'signup',
  'register',
  'auth',
  'oauth',
  'callback',
  'webhook',
  'webhooks',
  'static',
  'assets',
  'cdn',
  'help',
  'support',
  'docs',
  'documentation',
  'blog',
  'status',
  'health',
  'ping',
]);

/**
 * Validates that a tenant slug is safe and properly formatted
 * @param slug - The slug to validate
 * @returns Object with isValid flag and optional error message
 */
function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug) {
    return { isValid: false, error: 'El identificador de la organizacion esta vacio' };
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    return {
      isValid: false,
      error: `El identificador de la organizacion es demasiado largo (maximo ${MAX_SLUG_LENGTH} caracteres)`,
    };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      isValid: false,
      error: 'El identificador de la organizacion contiene caracteres invalidos',
    };
  }

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return {
      isValid: false,
      error: 'Este enlace no corresponde a una organizacion valida',
    };
  }

  // Check for consecutive hyphens
  if (slug.includes('--')) {
    return {
      isValid: false,
      error: 'El identificador de la organizacion tiene un formato invalido',
    };
  }

  return { isValid: true };
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
    error: null,
  });

  useEffect(() => {
    async function getInitialURL() {
      try {
        // Get initial URL that opened the app
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          console.log('[DeepLink] Processing initial URL:', initialUrl);
          const { tenantSlug, rafflePath, error: parseError } = parseDeepLink(initialUrl);

          if (parseError) {
            console.warn('[DeepLink] Parse error:', parseError);
            setState({
              tenantId: null,
              tenantSlug: null,
              rafflePath: null,
              isLoading: false,
              error: parseError,
            });
            return;
          }

          if (tenantSlug) {
            // Validate the tenant slug
            const validation = validateSlug(tenantSlug);
            if (!validation.isValid) {
              console.warn('[DeepLink] Invalid tenant slug:', tenantSlug, validation.error);
              setState({
                tenantId: null,
                tenantSlug: null,
                rafflePath: null,
                isLoading: false,
                error: validation.error || 'Organizacion invalida',
              });
              return;
            }

            // Look up tenant ID from slug
            const tenantId = TENANT_MAP[tenantSlug] || tenantSlug;
            console.log('[DeepLink] Valid tenant found:', { tenantSlug, tenantId, rafflePath });
            setState({
              tenantId,
              tenantSlug,
              rafflePath,
              isLoading: false,
              error: null,
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
          error: null,
        });
      } catch (err) {
        console.error('[DeepLink] Error processing initial URL:', err);
        setState({
          tenantId: null,
          tenantSlug: null,
          rafflePath: null,
          isLoading: false,
          error: 'Error al procesar el enlace',
        });
      }
    }

    getInitialURL();

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DeepLink] Received URL event:', event.url);
      const { tenantSlug, rafflePath, error: parseError } = parseDeepLink(event.url);

      if (parseError) {
        console.warn('[DeepLink] Parse error from event:', parseError);
        setState((prev) => ({
          ...prev,
          error: parseError,
        }));
        return;
      }

      if (tenantSlug) {
        // Validate the tenant slug
        const validation = validateSlug(tenantSlug);
        if (!validation.isValid) {
          console.warn('[DeepLink] Invalid tenant slug from event:', tenantSlug, validation.error);
          setState((prev) => ({
            ...prev,
            error: validation.error || 'Organizacion invalida',
          }));
          return;
        }

        const tenantId = TENANT_MAP[tenantSlug] || tenantSlug;
        console.log('[DeepLink] Valid tenant from event:', { tenantSlug, tenantId, rafflePath });
        setState({
          tenantId,
          tenantSlug,
          rafflePath,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return state;
}

/**
 * Clears the current deep link error
 * Useful for dismissing error alerts
 */
export function useClearDeepLinkError(
  setState: React.Dispatch<React.SetStateAction<TenantState>>
) {
  return useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, [setState]);
}

interface ParsedDeepLink {
  tenantSlug: string | null;
  rafflePath: string | null;
  error?: string;
}

function parseDeepLink(url: string): ParsedDeepLink {
  try {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      console.warn('[DeepLink] Invalid URL provided:', url);
      return { tenantSlug: null, rafflePath: null, error: 'Enlace invalido' };
    }

    const parsed = Linking.parse(url);

    // Handle custom scheme: sortavo://tenant-slug/path
    if (parsed.scheme === 'sortavo') {
      const pathParts = (parsed.path || '').split('/').filter(Boolean);
      const tenantSlug = parsed.hostname || pathParts[0] || null;

      if (!tenantSlug) {
        return { tenantSlug: null, rafflePath: null, error: 'No se encontro la organizacion en el enlace' };
      }

      return {
        tenantSlug,
        rafflePath: pathParts.slice(parsed.hostname ? 0 : 1).join('/') || null,
      };
    }

    // Handle web URL: https://sortavo.com/t/tenant-slug/path
    if (parsed.path?.startsWith('/t/')) {
      const pathParts = parsed.path.slice(3).split('/');
      const tenantSlug = pathParts[0] || null;

      if (!tenantSlug) {
        return { tenantSlug: null, rafflePath: null, error: 'No se encontro la organizacion en el enlace' };
      }

      return {
        tenantSlug,
        rafflePath: pathParts.slice(1).join('/') || null,
      };
    }

    // Handle subdomain: https://tenant-slug.sortavo.com/path
    if (parsed.hostname?.endsWith('.sortavo.com')) {
      const subdomain = parsed.hostname.replace('.sortavo.com', '');
      if (subdomain && !RESERVED_SLUGS.has(subdomain.toLowerCase())) {
        return {
          tenantSlug: subdomain,
          rafflePath: parsed.path || null,
        };
      }
    }

    // No tenant found in URL - this is not necessarily an error
    return { tenantSlug: null, rafflePath: null };
  } catch (e) {
    console.error('[DeepLink] Failed to parse deep link:', e, 'URL:', url);
    return { tenantSlug: null, rafflePath: null, error: 'Error al procesar el enlace' };
  }
}
