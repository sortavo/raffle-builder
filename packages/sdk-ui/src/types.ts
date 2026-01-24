// SDK UI Component Types
import type { Raffle, Ticket, TicketPackage, SortavoTheme } from '@sortavo/sdk';

// Common props for all SDK UI components
export interface SortavoComponentProps {
  style?: any;
  className?: string;
  testID?: string;
}

// Raffle List Component
export interface RaffleListProps extends SortavoComponentProps {
  status?: 'active' | 'completed' | 'all';
  onRafflePress?: (raffle: Raffle) => void;
  renderRaffleCard?: (raffle: Raffle) => React.ReactNode;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  columns?: 1 | 2;
  showStatus?: boolean;
  showProgress?: boolean;
  showCountdown?: boolean;
}

// Raffle Card Component
export interface RaffleCardProps extends SortavoComponentProps {
  raffle: Raffle;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showProgress?: boolean;
  showCountdown?: boolean;
  showPrizes?: boolean;
}

// Raffle Detail Component
export interface RaffleDetailProps extends SortavoComponentProps {
  raffleId?: string;
  raffleSlug?: string;
  onBuyTickets?: () => void;
  showHeader?: boolean;
  showPrizes?: boolean;
  showPackages?: boolean;
  showProgress?: boolean;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
}

// Ticket Grid Component
export interface TicketGridProps extends SortavoComponentProps {
  raffleId: string;
  onTicketSelect?: (ticket: Ticket) => void;
  selectedTickets?: Ticket[];
  columns?: number;
  showNumbers?: boolean;
  availableColor?: string;
  selectedColor?: string;
  soldColor?: string;
}

// Ticket Selector Component (Package-based selection)
export interface TicketSelectorProps extends SortavoComponentProps {
  packages: TicketPackage[];
  onPackageSelect?: (pkg: TicketPackage) => void;
  selectedPackage?: TicketPackage | null;
  showBestValue?: boolean;
  showDiscount?: boolean;
}

// Purchase Summary Component
export interface PurchaseSummaryProps extends SortavoComponentProps {
  ticketCount: number;
  totalAmount: number;
  currency: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showBreakdown?: boolean;
}

// Checkout Flow Component
export interface CheckoutFlowProps extends SortavoComponentProps {
  raffleId: string;
  onSuccess?: (purchaseId: string) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  paymentMethods?: ('card' | 'oxxo' | 'transfer')[];
}

// My Tickets Component
export interface MyTicketsProps extends SortavoComponentProps {
  raffleId?: string;
  onTicketPress?: (ticket: Ticket) => void;
  emptyComponent?: React.ReactNode;
  groupByRaffle?: boolean;
}

// Prize List Component
export interface PrizeListProps extends SortavoComponentProps {
  prizes: Raffle['prizes'];
  variant?: 'list' | 'carousel' | 'grid';
  showPosition?: boolean;
  showValue?: boolean;
}

// Countdown Timer Component
export interface CountdownProps extends SortavoComponentProps {
  targetDate: Date;
  onComplete?: () => void;
  variant?: 'default' | 'compact' | 'large';
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
}

// Progress Bar Component
export interface ProgressBarProps extends SortavoComponentProps {
  sold: number;
  total: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
}

// Theme Provider Props
export interface ThemeProviderProps {
  theme?: SortavoTheme;
  children: React.ReactNode;
}
