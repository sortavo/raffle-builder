// @sortavo/sdk - Official Sortavo SDK
// Headless SDK for embedding raffle experiences

// Core client
export { SortavoClient, createSortavoClient } from './client';

// State management
export { useSortavoStore } from './store';

// Types
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
} from './types';

// Version
export const SDK_VERSION = '1.0.0';
