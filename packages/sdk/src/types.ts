// SDK Types - Enterprise-ready multi-tenant configuration

export interface SortavoConfig {
  // Tenant identification
  tenantId: string;                    // Organization/raffle organizer ID
  tenantSlug?: string;                 // For URL-based routing

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
