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
  PaginatedResponse,
  ApiResponse,
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
