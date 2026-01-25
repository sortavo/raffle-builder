// App Providers
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SortavoProvider } from '@sortavo/sdk/react';
import { ThemeProvider } from '@sortavo/sdk-ui/native';
import { TranslationProvider } from '../i18n';
import { useTenantFromDeepLink } from '../hooks/useTenantFromDeepLink';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Get tenant from deep link or default
  const { tenantId, tenantSlug, isLoading } = useTenantFromDeepLink();

  // Don't render until we know the tenant
  if (isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SortavoProvider
        config={{
          tenantId: tenantId || 'default',
          tenantSlug: tenantSlug ?? undefined,
          features: {
            enablePayments: false, // Payments handled on web, not in app
            enableNotifications: true,
            enableAnalytics: true,
            enableOfflineMode: false,
          },
        }}
      >
        <TranslationProvider defaultLocale="es">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </TranslationProvider>
      </SortavoProvider>
    </QueryClientProvider>
  );
}
