# @sortavo/sdk

Official SDK for embedding Sortavo raffle experiences into your applications.

## Installation

```bash
npm install @sortavo/sdk
# or
yarn add @sortavo/sdk
```

## Quick Start

### React / React Native

```tsx
import { SortavoProvider, useRaffles, useAuth } from '@sortavo/sdk/react';

function App() {
  return (
    <SortavoProvider
      config={{
        tenantId: 'your-organization-id',
        features: {
          enablePayments: true,
          enableNotifications: true,
        },
      }}
    >
      <YourApp />
    </SortavoProvider>
  );
}

function RaffleList() {
  const { raffles, isLoading } = useRaffles({ status: 'active' });
  const { isAuthenticated, signIn } = useAuth();

  if (isLoading) return <Loading />;

  return (
    <div>
      {raffles.map((raffle) => (
        <RaffleCard key={raffle.id} raffle={raffle} />
      ))}
    </div>
  );
}
```

### Headless (Vanilla JS)

```typescript
import { createSortavoClient } from '@sortavo/sdk';

const client = createSortavoClient({
  tenantId: 'your-organization-id',
});

// Fetch raffles
const raffles = await client.getRaffles({ status: 'active' });

// Purchase tickets
const purchase = await client.createPurchase(raffleId, ['001', '002', '003']);
```

## Configuration

```typescript
interface SortavoConfig {
  // Required: Your organization ID
  tenantId: string;

  // Optional: Tenant slug for URL-based routing
  tenantSlug?: string;

  // Optional: Override default API endpoints
  supabaseUrl?: string;
  supabaseAnonKey?: string;

  // Optional: Feature flags
  features?: {
    enablePayments?: boolean;     // Default: true
    enableNotifications?: boolean; // Default: true
    enableAnalytics?: boolean;     // Default: true
    enableOfflineMode?: boolean;   // Default: false
  };

  // Optional: Custom theme
  theme?: SortavoTheme;

  // Optional: Callbacks
  onError?: (error: SortavoError) => void;
  onAuthChange?: (user: SortavoUser | null) => void;
}
```

## React Hooks

### Authentication

```tsx
const { user, isAuthenticated, signIn, signOut } = useAuth();
```

### Raffles

```tsx
// List raffles
const { raffles, pagination, isLoading, refetch } = useRaffles({
  status: 'active',
  page: 1,
  limit: 20,
});

// Get single raffle
const { raffle, isLoading, error } = useRaffle(raffleId);

// Get by slug
const { raffle } = useRaffleBySlug('my-raffle');
```

### Tickets

```tsx
// Available tickets
const { tickets, refetch } = useTickets(raffleId);

// Ticket selection
const { selectedTickets, toggleTicket, clearSelection } = useTicketSelection();

// My purchased tickets
const { tickets: myTickets } = useMyTickets(raffleId);
```

### Purchases

```tsx
const { createPurchase, isProcessing, totalAmount } = usePurchase();
const { purchases } = useMyPurchases();
```

## Multi-Tenant Support

The SDK supports multi-tenant applications where each tenant (organizer) has their own branded experience.

### Deep Links

For mobile apps, tenants are identified via deep links:

```
sortavo://tenant-slug/raffle/raffle-slug
https://sortavo.com/t/tenant-slug/raffle/raffle-slug
```

### React Native

```tsx
import { useDeepLinkTenant } from '@sortavo/sdk/react-native';

function App() {
  const { tenantId, tenantSlug } = useDeepLinkTenant();

  return (
    <SortavoProvider config={{ tenantId: tenantId || 'default' }}>
      <YourApp />
    </SortavoProvider>
  );
}
```

## Real-time Updates

The SDK automatically subscribes to real-time updates for ticket availability:

```tsx
const { tickets } = useTickets(raffleId);
// tickets updates automatically when other users purchase
```

## TypeScript

The SDK is fully typed:

```typescript
import type { Raffle, Ticket, Purchase, SortavoConfig } from '@sortavo/sdk';
```

## License

MIT
