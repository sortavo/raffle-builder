# @sortavo/sdk-ui

Pre-built UI components for the Sortavo SDK. Works with React Native.

## Installation

```bash
npm install @sortavo/sdk-ui @sortavo/sdk
```

## Quick Start

```tsx
import { SortavoProvider } from '@sortavo/sdk/react';
import { ThemeProvider, RaffleList, RaffleCard } from '@sortavo/sdk-ui/native';

function App() {
  return (
    <SortavoProvider config={{ tenantId: 'your-org-id' }}>
      <ThemeProvider>
        <RaffleList
          status="active"
          onRafflePress={(raffle) => navigate(`/raffle/${raffle.id}`)}
        />
      </ThemeProvider>
    </SortavoProvider>
  );
}
```

## Components

### RaffleList

Displays a list of raffles with loading and empty states.

```tsx
<RaffleList
  status="active"           // 'active' | 'completed' | 'all'
  onRafflePress={handlePress}
  columns={1}               // 1 or 2
  showProgress={true}
  showCountdown={true}
/>
```

### RaffleCard

Individual raffle card component.

```tsx
<RaffleCard
  raffle={raffle}
  onPress={() => {}}
  variant="default"         // 'default' | 'compact' | 'featured'
  showProgress={true}
  showCountdown={true}
  showPrizes={false}
/>
```

### TicketSelector

Package selection component.

```tsx
<TicketSelector
  packages={raffle.packages}
  selectedPackage={selected}
  onPackageSelect={setSelected}
  showBestValue={true}
  showDiscount={true}
/>
```

### PurchaseSummary

Purchase confirmation component.

```tsx
<PurchaseSummary
  ticketCount={3}
  totalAmount={150}
  currency="MXN"
  onConfirm={handlePurchase}
  onCancel={() => {}}
  isLoading={false}
/>
```

### ProgressBar

Ticket sales progress indicator.

```tsx
<ProgressBar
  sold={750}
  total={1000}
  showLabel={true}
  showPercentage={true}
/>
```

### Countdown

Countdown timer for raffle end dates.

```tsx
<Countdown
  targetDate={new Date('2024-12-31')}
  variant="default"         // 'default' | 'compact' | 'large'
  onComplete={() => {}}
/>
```

## Theming

Customize the appearance with a theme:

```tsx
import { ThemeProvider } from '@sortavo/sdk-ui/native';

const customTheme = {
  colors: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

## Utilities

```tsx
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '@sortavo/sdk-ui/native';

formatCurrency(150, 'MXN');    // "$150"
formatDate(new Date());         // "15 ene 2024"
formatRelativeTime(date);       // "en 2 días"
```

## License

MIT
