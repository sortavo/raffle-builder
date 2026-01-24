// @sortavo/sdk/react - React bindings for Sortavo SDK

export { SortavoProvider, useSortavoContext, useSortavoClient } from './provider';
export type { SortavoProviderProps } from './provider';

export {
  // Auth
  useAuth,
  // Raffles
  useRaffles,
  useRaffle,
  useRaffleBySlug,
  // Tickets
  useTickets,
  useTicketSelection,
  useMyTickets,
  // Purchases
  usePurchase,
  useMyPurchases,
  // Notifications
  useNotifications,
  // Organizations (Marketplace)
  useOrganizations,
  useOrganization,
  useOrganizationBySlug,
  useFollowOrganization,
  useFollowedOrganizations,
  // Feed (Marketplace)
  useFeed,
  useOrganizationRaffles,
  useRecentWinners,
  useSearchRaffles,
  // Utilities
  useSortavoError,
  useTenant,
} from './hooks';

// Re-export types
export type {
  SortavoConfig,
  SortavoTheme,
  SortavoUser,
  SortavoError,
  Raffle,
  Prize,
  Ticket,
  TicketPackage,
  Purchase,
  Notification,
  NotificationType,
  PaginatedResponse,
  ApiResponse,
  // Marketplace types
  Organization,
  OrganizationCategory,
  OrganizationFollow,
  FeedItem,
  FeedFilters,
  WinnerAnnouncement,
} from '../types';

// Re-export store selectors for advanced usage
export {
  useSortavoStore,
  selectConfig,
  selectUser,
  selectIsAuthenticated,
  selectCurrentRaffle,
  selectSelectedTickets,
  selectIsLoading,
  selectError,
} from '../store';
