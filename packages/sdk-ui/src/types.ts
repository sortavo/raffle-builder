// SDK UI Component Types
import type { Raffle, Ticket, TicketPackage, SortavoTheme, Prize } from '@sortavo/sdk';

// Common props for all SDK UI components
export interface SortavoComponentProps {
  style?: any;
  className?: string;
  testID?: string;
}

// ==================== Raffle Components ====================

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
  onShare?: () => void;
  showHeader?: boolean;
  showPrizes?: boolean;
  showPackages?: boolean;
  showProgress?: boolean;
  showOrganizer?: boolean;
  showRules?: boolean;
  showShareButton?: boolean;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
}

// ==================== Ticket Components ====================

// Ticket Grid Component
export interface TicketGridProps extends SortavoComponentProps {
  raffleId: string;
  tickets?: Ticket[];
  onTicketSelect?: (ticket: Ticket) => void;
  selectedTickets?: Ticket[];
  columns?: number;
  showNumbers?: boolean;
  showLegend?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  maxSelection?: number;
  availableColor?: string;
  selectedColor?: string;
  soldColor?: string;
  reservedColor?: string;
}

// Ticket Selector Component (Package-based selection)
export interface TicketSelectorProps extends SortavoComponentProps {
  packages: TicketPackage[];
  onPackageSelect?: (pkg: TicketPackage) => void;
  selectedPackage?: TicketPackage | null;
  showBestValue?: boolean;
  showDiscount?: boolean;
}

// My Tickets Display Variant
export type TicketDisplayVariant = 'default' | 'compact' | 'detailed';

// My Tickets Component
export interface MyTicketsProps extends SortavoComponentProps {
  raffleId?: string;
  onTicketPress?: (ticket: Ticket) => void;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  groupByRaffle?: boolean;
  variant?: TicketDisplayVariant;
  showFilters?: boolean;
}

// ==================== Purchase Components ====================

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
  selectedTicketCount?: number;
  selectedPackageId?: string;
  onSuccess?: (purchaseId: string) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  paymentMethods?: ('card' | 'oxxo' | 'transfer')[];
  showSteps?: boolean;
  allowCoupon?: boolean;
}

// ==================== Prize Components ====================

// Prize List Component
export interface PrizeListProps extends SortavoComponentProps {
  prizes: Prize[];
  variant?: 'list' | 'carousel' | 'grid';
  showPosition?: boolean;
  showValue?: boolean;
  currency?: string;
}

// ==================== UI Elements ====================

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

// ==================== Theme ====================

// Theme Provider Props
export interface ThemeProviderProps {
  theme?: SortavoTheme;
  children: React.ReactNode;
}

// ==================== State Components ====================

// Empty State Variants
export type EmptyStateVariant =
  | 'no-raffles'
  | 'no-tickets'
  | 'no-notifications'
  | 'no-results'
  | 'no-internet'
  | 'error'
  | 'coming-soon'
  | 'custom';

// Empty State Props
export interface EmptyStateProps extends SortavoComponentProps {
  variant?: EmptyStateVariant;
  icon?: string;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// Loading State Variants
export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse' | 'shimmer';

// Loading State Props
export interface LoadingStateProps extends SortavoComponentProps {
  variant?: LoadingVariant;
  size?: 'small' | 'medium' | 'large';
  message?: string;
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

// ==================== Notification Components ====================

// Notification Types
export type NotificationType =
  | 'purchase_confirmed'
  | 'raffle_starting'
  | 'raffle_ending'
  | 'winner_announcement'
  | 'ticket_reminder'
  | 'promotion'
  | 'system';

// Notification Data
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Notification Card Props
export interface NotificationCardProps extends SortavoComponentProps {
  notification: NotificationData;
  onPress?: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

// Notification List Props
export interface NotificationListProps extends SortavoComponentProps {
  notifications: NotificationData[];
  onNotificationPress?: (notification: NotificationData) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  showHeader?: boolean;
  emptyComponent?: React.ReactNode;
}

// ==================== Search Components ====================

// Search Bar Props
export interface SearchBarProps extends SortavoComponentProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  showCancelButton?: boolean;
  cancelText?: string;
  debounceMs?: number;
}

// Search Suggestion
export interface SearchSuggestion {
  id: string;
  text: string;
  type?: string;
}

// ==================== Organizer Components ====================

// Organizer Info
export interface OrganizerInfo {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  verified?: boolean;
  totalRaffles?: number;
  totalParticipants?: number;
  website?: string;
  phone?: string;
  email?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
}

// Organizer Card Props
export interface OrganizerCardProps extends SortavoComponentProps {
  organizer: OrganizerInfo;
  variant?: 'compact' | 'full' | 'inline';
  showStats?: boolean;
  showContact?: boolean;
  showSocial?: boolean;
  onPress?: () => void;
}

// ==================== Winner Components ====================

// Winner Info
export interface WinnerInfo {
  ticketNumber: string;
  prizeName: string;
  prizePosition: number;
  prizeImage?: string;
  raffleName: string;
  wonAt: Date;
}

// Winner Banner Props
export interface WinnerBannerProps extends SortavoComponentProps {
  winner: WinnerInfo;
  variant?: 'compact' | 'full' | 'celebration';
  showConfetti?: boolean;
  showShare?: boolean;
  onShare?: () => void;
  onViewPrize?: () => void;
  onDismiss?: () => void;
}
