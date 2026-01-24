// App Providers
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SortavoProvider } from '@sortavo/sdk/react';
import { ThemeProvider } from '@sortavo/sdk-ui/native';
import { useTenantFromDeepLink } from '../hooks/useTenantFromDeepLink';
import { StripeProvider } from '@stripe/stripe-react-native';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

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
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.sortavo"
      >
        <SortavoProvider
          config={{
            tenantId: tenantId || 'default',
            tenantSlug,
            features: {
              enablePayments: true,
              enableNotifications: true,
              enableAnalytics: true,
              enableOfflineMode: false,
            },
          }}
        >
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SortavoProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}
