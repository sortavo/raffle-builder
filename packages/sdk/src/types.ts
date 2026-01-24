// SDK Types - Enterprise-ready multi-tenant configuration

export interface SortavoConfig {
  // Tenant identification (optional for marketplace mode)
  tenantId?: string;                   // Organization/raffle organizer ID (optional in marketplace mode)
  tenantSlug?: string;                 // For URL-based routing

  // Marketplace mode - browse all organizers
  marketplaceMode?: boolean;           // Default: false - enables multi-org browsing

  // Optional API overrides (for enterprise clients with own infrastructure)
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;

  // Feature flags
  features?: {
    enablePayments?: boolean;          // Default: true
    enableNotifications?: boolean;     // Default: true
    enableAnalytics?: boolean;         // Default: true
    enableOfflineMode?: boolean;       // Default: false (mobile only)
  };

  // Theming
  theme?: SortavoTheme;

  // Callbacks
  onError?: (error: SortavoError) => void;
  onAuthChange?: (user: SortavoUser | null) => void;
}

export interface SortavoTheme {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    textSecondary?: string;
    error?: string;
    success?: string;
    warning?: string;
  };
  fonts?: {
    regular?: string;
    medium?: string;
    bold?: string;
  };
  borderRadius?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  spacing?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export interface SortavoUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  role: 'participant' | 'organizer' | 'admin';
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface SortavoError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

// Raffle Types
export interface Raffle {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  slug: string;
  imageUrl?: string;
  coverImageUrl?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  drawDate?: Date;
  ticketPrice: number;
  currency: string;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  prizes: Prize[];
  packages: TicketPackage[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prize {
  id: string;
  position: number;
  title: string;
  description?: string;
  imageUrl?: string;
  value?: number;
}

export interface TicketPackage {
  id: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  label?: string;
  isBestValue?: boolean;
}

export interface Ticket {
  id: string;
  raffleId: string;
  number: string;
  status: 'available' | 'reserved' | 'sold' | 'won';
  userId?: string;
  purchasedAt?: Date;
  reservedUntil?: Date;
}

export interface Purchase {
  id: string;
  raffleId: string;
  userId: string;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentIntentId?: string;
  createdAt: Date;
  completedAt?: Date;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: SortavoError;
}

// Notification Types
export type NotificationType =
  | 'purchase_confirmed'
  | 'raffle_starting'
  | 'raffle_ending'
  | 'winner_announcement'
  | 'ticket_reminder'
  | 'promotion'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
}

// Organization Types (for marketplace mode)
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  verified: boolean;
  category?: OrganizationCategory;
  location?: string;
  socialLinks?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
  stats: {
    totalRaffles: number;
    activeRaffles: number;
    completedRaffles: number;
    totalParticipants: number;
    rating?: number;
    reviewCount?: number;
  };
  isFollowing?: boolean;
  followerCount?: number;
  createdAt: Date;
}

export type OrganizationCategory =
  | 'charity'
  | 'sports'
  | 'entertainment'
  | 'education'
  | 'community'
  | 'business'
  | 'religious'
  | 'other';

export interface OrganizationFollow {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
}

// Feed Types
export interface FeedItem {
  id: string;
  type: 'raffle' | 'winner' | 'new_organizer';
  raffle?: Raffle;
  organization?: Organization;
  winner?: WinnerAnnouncement;
  timestamp: Date;
}

export interface WinnerAnnouncement {
  id: string;
  raffleId: string;
  raffleTitle: string;
  prizeTitle: string;
  winnerName: string;
  winnerAvatar?: string;
  ticketNumber: string;
  organizationName: string;
  organizationSlug: string;
  announcedAt: Date;
}

// Feed Filters
export interface FeedFilters {
  category?: OrganizationCategory;
  status?: 'active' | 'ending_soon' | 'new';
  priceRange?: { min?: number; max?: number };
  sortBy?: 'trending' | 'ending_soon' | 'newest' | 'price_low' | 'price_high';
  followedOnly?: boolean;
}
