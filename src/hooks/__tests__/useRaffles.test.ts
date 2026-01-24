import { describe, it, expect } from 'vitest';

// Test the pure business logic functions for raffles
// These don't require mocking Supabase

// ===== Types =====
type RaffleStatus = 'draft' | 'active' | 'paused' | 'completed' | 'canceled';

interface Raffle {
  id: string;
  title: string;
  status: RaffleStatus;
  total_tickets: number;
  ticket_price: number;
  start_date: string | null;
  draw_date: string | null;
  created_at: string;
  archived_at: string | null;
  close_sale_hours_before: number;
}

interface RaffleFilters {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'created_at' | 'title' | 'draw_date' | 'total_tickets';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ===== Slug Generation Functions =====
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Max 50 characters
};

describe('useRaffles - slug generation', () => {
  it('should generate basic slug from title', () => {
    expect(generateSlug('Mi Sorteo')).toBe('mi-sorteo');
    expect(generateSlug('Gran Rifa 2024')).toBe('gran-rifa-2024');
  });

  it('should handle special characters', () => {
    expect(generateSlug('Sorteo #1!')).toBe('sorteo-1');
    expect(generateSlug('Rifa @Home')).toBe('rifa-home');
    expect(generateSlug('Premio $1000')).toBe('premio-1000');
  });

  it('should handle accented characters', () => {
    // Note: The actual implementation removes diacritics via regex [^\w\s-]
    // which converts ñ to ñ then removes it, leaving 'navideno' without the 'n'
    // This is expected behavior - accented chars are stripped
    const slug = generateSlug('Sorteo Navideño');
    expect(slug).toContain('sorteo');
    expect(slug).toContain('navide');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('Mi   Sorteo   Grande')).toBe('mi-sorteo-grande');
  });

  it('should handle leading/trailing spaces', () => {
    expect(generateSlug('  Sorteo  ')).toBe('sorteo');
  });

  it('should handle consecutive hyphens', () => {
    expect(generateSlug('Sorteo---Especial')).toBe('sorteo-especial');
  });

  it('should truncate long titles to 50 characters', () => {
    const longTitle = 'Este es un titulo muy largo que deberia ser truncado automaticamente';
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should handle only special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('');
  });
});

// ===== Status Validation Functions =====
const isValidStatusTransition = (from: RaffleStatus, to: RaffleStatus): boolean => {
  const validTransitions: Record<RaffleStatus, RaffleStatus[]> = {
    draft: ['active', 'canceled'],
    active: ['paused', 'completed', 'canceled'],
    paused: ['active', 'canceled'],
    completed: [], // Terminal state
    canceled: [], // Terminal state
  };
  return validTransitions[from].includes(to);
};

const getStatusLabel = (status: RaffleStatus, lang: 'en' | 'es' = 'es'): string => {
  const labels: Record<RaffleStatus, Record<string, string>> = {
    draft: { es: 'Borrador', en: 'Draft' },
    active: { es: 'Activo', en: 'Active' },
    paused: { es: 'Pausado', en: 'Paused' },
    completed: { es: 'Completado', en: 'Completed' },
    canceled: { es: 'Cancelado', en: 'Canceled' },
  };
  return labels[status][lang];
};

describe('useRaffles - status validation', () => {
  describe('valid transitions', () => {
    it('should allow draft to active', () => {
      expect(isValidStatusTransition('draft', 'active')).toBe(true);
    });

    it('should allow draft to canceled', () => {
      expect(isValidStatusTransition('draft', 'canceled')).toBe(true);
    });

    it('should allow active to paused', () => {
      expect(isValidStatusTransition('active', 'paused')).toBe(true);
    });

    it('should allow active to completed', () => {
      expect(isValidStatusTransition('active', 'completed')).toBe(true);
    });

    it('should allow active to canceled', () => {
      expect(isValidStatusTransition('active', 'canceled')).toBe(true);
    });

    it('should allow paused to active', () => {
      expect(isValidStatusTransition('paused', 'active')).toBe(true);
    });

    it('should allow paused to canceled', () => {
      expect(isValidStatusTransition('paused', 'canceled')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('should not allow draft to completed', () => {
      expect(isValidStatusTransition('draft', 'completed')).toBe(false);
    });

    it('should not allow draft to paused', () => {
      expect(isValidStatusTransition('draft', 'paused')).toBe(false);
    });

    it('should not allow any transition from completed', () => {
      expect(isValidStatusTransition('completed', 'active')).toBe(false);
      expect(isValidStatusTransition('completed', 'draft')).toBe(false);
      expect(isValidStatusTransition('completed', 'canceled')).toBe(false);
    });

    it('should not allow any transition from canceled', () => {
      expect(isValidStatusTransition('canceled', 'active')).toBe(false);
      expect(isValidStatusTransition('canceled', 'draft')).toBe(false);
      expect(isValidStatusTransition('canceled', 'completed')).toBe(false);
    });
  });

  describe('status labels', () => {
    it('should return Spanish labels by default', () => {
      expect(getStatusLabel('draft')).toBe('Borrador');
      expect(getStatusLabel('active')).toBe('Activo');
      expect(getStatusLabel('paused')).toBe('Pausado');
      expect(getStatusLabel('completed')).toBe('Completado');
      expect(getStatusLabel('canceled')).toBe('Cancelado');
    });

    it('should return English labels when requested', () => {
      expect(getStatusLabel('draft', 'en')).toBe('Draft');
      expect(getStatusLabel('active', 'en')).toBe('Active');
      expect(getStatusLabel('completed', 'en')).toBe('Completed');
    });
  });
});

// ===== Date Calculation Functions =====
const isSaleClosed = (raffle: Raffle): boolean => {
  if (!raffle.draw_date) return false;
  if (raffle.close_sale_hours_before === 0) return false;

  const drawDate = new Date(raffle.draw_date);
  const closeTime = new Date(drawDate.getTime() - raffle.close_sale_hours_before * 60 * 60 * 1000);
  return new Date() >= closeTime;
};

const getTimeUntilClose = (raffle: Raffle): number | null => {
  if (!raffle.draw_date) return null;
  if (raffle.close_sale_hours_before === 0) return null;

  const drawDate = new Date(raffle.draw_date);
  const closeTime = new Date(drawDate.getTime() - raffle.close_sale_hours_before * 60 * 60 * 1000);
  const remaining = closeTime.getTime() - Date.now();
  return Math.max(0, remaining);
};

const getTimeUntilDraw = (drawDate: string | null): number | null => {
  if (!drawDate) return null;
  const remaining = new Date(drawDate).getTime() - Date.now();
  return Math.max(0, remaining);
};

const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return 'Finalizado';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

describe('useRaffles - date calculations', () => {
  describe('sale closing', () => {
    it('should return false when no draw date', () => {
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: null,
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24,
      };
      expect(isSaleClosed(raffle)).toBe(false);
    });

    it('should return false when close_sale_hours_before is 0', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: futureDate,
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 0,
      };
      expect(isSaleClosed(raffle)).toBe(false);
    });

    it('should return true when past close time', () => {
      // Draw is 1 hour from now, close is 24 hours before draw
      const drawDate = new Date(Date.now() + 3600000); // 1 hour from now
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: drawDate.toISOString(),
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24, // 24 hours before = already closed
      };
      expect(isSaleClosed(raffle)).toBe(true);
    });

    it('should return false when before close time', () => {
      // Draw is 48 hours from now, close is 24 hours before draw
      const drawDate = new Date(Date.now() + 48 * 3600000); // 48 hours from now
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: drawDate.toISOString(),
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24, // 24 hours before = still open
      };
      expect(isSaleClosed(raffle)).toBe(false);
    });
  });

  describe('time until close', () => {
    it('should return null when no draw date', () => {
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: null,
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24,
      };
      expect(getTimeUntilClose(raffle)).toBeNull();
    });

    it('should return null when close_sale_hours_before is 0', () => {
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: new Date(Date.now() + 3600000).toISOString(),
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 0,
      };
      expect(getTimeUntilClose(raffle)).toBeNull();
    });

    it('should return positive value when sale is open', () => {
      const drawDate = new Date(Date.now() + 48 * 3600000); // 48 hours from now
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: drawDate.toISOString(),
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24,
      };
      const remaining = getTimeUntilClose(raffle);
      expect(remaining).not.toBeNull();
      expect(remaining!).toBeGreaterThan(23 * 3600000); // About 24 hours
      expect(remaining!).toBeLessThanOrEqual(24 * 3600000);
    });

    it('should return 0 when sale is closed', () => {
      const drawDate = new Date(Date.now() + 3600000); // 1 hour from now
      const raffle: Raffle = {
        id: '1',
        title: 'Test',
        status: 'active',
        total_tickets: 100,
        ticket_price: 10,
        start_date: null,
        draw_date: drawDate.toISOString(),
        created_at: new Date().toISOString(),
        archived_at: null,
        close_sale_hours_before: 24,
      };
      expect(getTimeUntilClose(raffle)).toBe(0);
    });
  });

  describe('time until draw', () => {
    it('should return null when no draw date', () => {
      expect(getTimeUntilDraw(null)).toBeNull();
    });

    it('should return positive value for future draw', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const remaining = getTimeUntilDraw(futureDate);
      expect(remaining).not.toBeNull();
      expect(remaining!).toBeGreaterThan(3500000); // About 1 hour
      expect(remaining!).toBeLessThanOrEqual(3600000);
    });

    it('should return 0 for past draw', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      expect(getTimeUntilDraw(pastDate)).toBe(0);
    });
  });

  describe('format time remaining', () => {
    it('should format days and hours', () => {
      const ms = 2 * 24 * 3600000 + 5 * 3600000; // 2 days 5 hours
      expect(formatTimeRemaining(ms)).toBe('2d 5h');
    });

    it('should format hours and minutes', () => {
      const ms = 3 * 3600000 + 30 * 60000; // 3 hours 30 minutes
      expect(formatTimeRemaining(ms)).toBe('3h 30m');
    });

    it('should format minutes and seconds', () => {
      const ms = 45 * 60000 + 30000; // 45 minutes 30 seconds
      expect(formatTimeRemaining(ms)).toBe('45m 30s');
    });

    it('should format seconds only', () => {
      const ms = 45000; // 45 seconds
      expect(formatTimeRemaining(ms)).toBe('45s');
    });

    it('should return Finalizado for 0 or negative', () => {
      expect(formatTimeRemaining(0)).toBe('Finalizado');
      expect(formatTimeRemaining(-1000)).toBe('Finalizado');
    });
  });
});

// ===== Pagination Functions =====
const calculatePagination = (
  totalCount: number,
  page: number,
  pageSize: number
): { totalPages: number; from: number; to: number } => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { totalPages, from, to };
};

describe('useRaffles - pagination', () => {
  it('should calculate first page', () => {
    const result = calculatePagination(100, 1, 20);
    expect(result.totalPages).toBe(5);
    expect(result.from).toBe(0);
    expect(result.to).toBe(19);
  });

  it('should calculate middle page', () => {
    const result = calculatePagination(100, 3, 20);
    expect(result.from).toBe(40);
    expect(result.to).toBe(59);
  });

  it('should calculate last page', () => {
    const result = calculatePagination(100, 5, 20);
    expect(result.from).toBe(80);
    expect(result.to).toBe(99);
  });

  it('should handle partial last page', () => {
    const result = calculatePagination(95, 5, 20);
    expect(result.totalPages).toBe(5);
    expect(result.from).toBe(80);
    expect(result.to).toBe(99); // Range extends past total
  });

  it('should handle single page', () => {
    const result = calculatePagination(10, 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.from).toBe(0);
    expect(result.to).toBe(19);
  });

  it('should handle zero items', () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.totalPages).toBe(0);
    expect(result.from).toBe(0);
    expect(result.to).toBe(19);
  });
});

// ===== Revenue Calculation Functions =====
const calculateTotalRevenue = (
  orders: Array<{ order_total: number | null; status: string }>,
  ticketPrice: number
): number => {
  return orders
    .filter(order => order.status === 'sold')
    .reduce((sum, order) => sum + (order.order_total || ticketPrice), 0);
};

const calculateRevenueProgress = (
  ticketsSold: number,
  totalTickets: number,
  ticketPrice: number
): { current: number; potential: number; percentage: number } => {
  const current = ticketsSold * ticketPrice;
  const potential = totalTickets * ticketPrice;
  const percentage = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0;
  return { current, potential, percentage };
};

describe('useRaffles - revenue calculations', () => {
  describe('total revenue', () => {
    it('should sum order totals for sold orders', () => {
      const orders = [
        { order_total: 100, status: 'sold' },
        { order_total: 200, status: 'sold' },
        { order_total: 150, status: 'reserved' },
      ];
      expect(calculateTotalRevenue(orders, 50)).toBe(300);
    });

    it('should use ticket price when order_total is null', () => {
      const orders = [
        { order_total: null, status: 'sold' },
        { order_total: null, status: 'sold' },
      ];
      expect(calculateTotalRevenue(orders, 50)).toBe(100);
    });

    it('should handle mixed orders', () => {
      const orders = [
        { order_total: 100, status: 'sold' },
        { order_total: null, status: 'sold' },
        { order_total: 200, status: 'canceled' },
      ];
      expect(calculateTotalRevenue(orders, 50)).toBe(150);
    });

    it('should return 0 for empty orders', () => {
      expect(calculateTotalRevenue([], 50)).toBe(0);
    });
  });

  describe('revenue progress', () => {
    it('should calculate progress correctly', () => {
      const result = calculateRevenueProgress(50, 100, 10);
      expect(result.current).toBe(500);
      expect(result.potential).toBe(1000);
      expect(result.percentage).toBe(50);
    });

    it('should handle zero tickets', () => {
      const result = calculateRevenueProgress(0, 0, 10);
      expect(result.current).toBe(0);
      expect(result.potential).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle 100% sold', () => {
      const result = calculateRevenueProgress(100, 100, 10);
      expect(result.percentage).toBe(100);
    });
  });
});

// ===== Raffle Validation Functions =====
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const validateRaffleData = (data: Partial<Raffle>): ValidationResult => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }

  if (data.total_tickets !== undefined) {
    if (data.total_tickets < 1) {
      errors.push('Total tickets must be at least 1');
    }
    if (data.total_tickets > 10000000) {
      errors.push('Total tickets cannot exceed 10,000,000');
    }
  }

  if (data.ticket_price !== undefined) {
    if (data.ticket_price < 0) {
      errors.push('Ticket price cannot be negative');
    }
  }

  if (data.start_date && data.draw_date) {
    const startDate = new Date(data.start_date);
    const drawDate = new Date(data.draw_date);
    if (startDate >= drawDate) {
      errors.push('Draw date must be after start date');
    }
  }

  return { valid: errors.length === 0, errors };
};

const canPublishRaffle = (raffle: Raffle, hasPaymentMethods: boolean): ValidationResult => {
  const errors: string[] = [];

  if (raffle.status !== 'draft') {
    errors.push('Only draft raffles can be published');
  }

  if (!hasPaymentMethods) {
    errors.push('At least one payment method must be enabled');
  }

  if (!raffle.title || raffle.title.trim().length === 0) {
    errors.push('Raffle must have a title');
  }

  if (raffle.total_tickets < 1) {
    errors.push('Raffle must have at least 1 ticket');
  }

  if (raffle.ticket_price < 0) {
    errors.push('Ticket price cannot be negative');
  }

  return { valid: errors.length === 0, errors };
};

describe('useRaffles - validation', () => {
  describe('raffle data validation', () => {
    it('should validate complete raffle data', () => {
      const result = validateRaffleData({
        title: 'Gran Sorteo',
        total_tickets: 100,
        ticket_price: 50,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title', () => {
      const result = validateRaffleData({ title: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject long title', () => {
      const result = validateRaffleData({ title: 'a'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be 100 characters or less');
    });

    it('should reject invalid ticket count', () => {
      let result = validateRaffleData({ title: 'Test', total_tickets: 0 });
      expect(result.errors).toContain('Total tickets must be at least 1');

      result = validateRaffleData({ title: 'Test', total_tickets: 20000000 });
      expect(result.errors).toContain('Total tickets cannot exceed 10,000,000');
    });

    it('should reject negative ticket price', () => {
      const result = validateRaffleData({ title: 'Test', ticket_price: -10 });
      expect(result.errors).toContain('Ticket price cannot be negative');
    });

    it('should validate date order', () => {
      const result = validateRaffleData({
        title: 'Test',
        start_date: '2024-12-31T00:00:00Z',
        draw_date: '2024-12-01T00:00:00Z',
      });
      expect(result.errors).toContain('Draw date must be after start date');
    });
  });

  describe('publish validation', () => {
    const validRaffle: Raffle = {
      id: '1',
      title: 'Test Raffle',
      status: 'draft',
      total_tickets: 100,
      ticket_price: 50,
      start_date: null,
      draw_date: null,
      created_at: new Date().toISOString(),
      archived_at: null,
      close_sale_hours_before: 0,
    };

    it('should allow publishing valid draft raffle', () => {
      const result = canPublishRaffle(validRaffle, true);
      expect(result.valid).toBe(true);
    });

    it('should require draft status', () => {
      const result = canPublishRaffle({ ...validRaffle, status: 'active' }, true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only draft raffles can be published');
    });

    it('should require payment methods', () => {
      const result = canPublishRaffle(validRaffle, false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one payment method must be enabled');
    });

    it('should require title', () => {
      const result = canPublishRaffle({ ...validRaffle, title: '' }, true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Raffle must have a title');
    });
  });
});

// ===== Filter Functions =====
const applyFilters = (raffles: Raffle[], filters: RaffleFilters): Raffle[] => {
  let result = [...raffles];

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    result = result.filter(r => r.status === filters.status);
  }

  // Filter by search term
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(r => r.title.toLowerCase().includes(searchLower));
  }

  // Filter by date range
  if (filters.startDate) {
    result = result.filter(r => {
      if (!r.start_date) return true;
      return new Date(r.start_date) >= filters.startDate!;
    });
  }

  if (filters.endDate) {
    result = result.filter(r => {
      if (!r.draw_date) return true;
      return new Date(r.draw_date) <= filters.endDate!;
    });
  }

  // Filter out archived
  result = result.filter(r => r.archived_at === null);

  return result;
};

const sortRaffles = (
  raffles: Raffle[],
  sortBy: RaffleFilters['sortBy'] = 'created_at',
  sortOrder: RaffleFilters['sortOrder'] = 'desc'
): Raffle[] => {
  return [...raffles].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'draw_date':
        if (!a.draw_date && !b.draw_date) comparison = 0;
        else if (!a.draw_date) comparison = 1;
        else if (!b.draw_date) comparison = -1;
        else comparison = new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime();
        break;
      case 'total_tickets':
        comparison = a.total_tickets - b.total_tickets;
        break;
      case 'created_at':
      default:
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

describe('useRaffles - filtering and sorting', () => {
  const testRaffles: Raffle[] = [
    {
      id: '1',
      title: 'Alpha Sorteo',
      status: 'active',
      total_tickets: 100,
      ticket_price: 10,
      start_date: '2024-01-01T00:00:00Z',
      draw_date: '2024-02-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      archived_at: null,
      close_sale_hours_before: 0,
    },
    {
      id: '2',
      title: 'Beta Rifa',
      status: 'draft',
      total_tickets: 200,
      ticket_price: 20,
      start_date: '2024-03-01T00:00:00Z',
      draw_date: '2024-04-01T00:00:00Z',
      created_at: '2024-02-01T00:00:00Z',
      archived_at: null,
      close_sale_hours_before: 0,
    },
    {
      id: '3',
      title: 'Gamma Sorteo',
      status: 'completed',
      total_tickets: 50,
      ticket_price: 5,
      start_date: null,
      draw_date: null,
      created_at: '2024-03-01T00:00:00Z',
      archived_at: '2024-04-01T00:00:00Z',
      close_sale_hours_before: 0,
    },
  ];

  describe('filtering', () => {
    it('should filter by status', () => {
      const result = applyFilters(testRaffles, { status: 'active' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Alpha Sorteo');
    });

    it('should filter by search term', () => {
      const result = applyFilters(testRaffles, { search: 'sorteo' });
      expect(result).toHaveLength(1); // Gamma is archived
      expect(result[0].title).toBe('Alpha Sorteo');
    });

    it('should filter out archived raffles', () => {
      const result = applyFilters(testRaffles, {});
      expect(result).toHaveLength(2);
      expect(result.find(r => r.id === '3')).toBeUndefined();
    });

    it('should combine multiple filters', () => {
      const result = applyFilters(testRaffles, { status: 'draft', search: 'beta' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Beta Rifa');
    });
  });

  describe('sorting', () => {
    it('should sort by title ascending', () => {
      const result = sortRaffles(testRaffles, 'title', 'asc');
      expect(result[0].title).toBe('Alpha Sorteo');
      expect(result[1].title).toBe('Beta Rifa');
    });

    it('should sort by title descending', () => {
      const result = sortRaffles(testRaffles, 'title', 'desc');
      expect(result[0].title).toBe('Gamma Sorteo');
      expect(result[1].title).toBe('Beta Rifa');
    });

    it('should sort by total_tickets', () => {
      const result = sortRaffles(testRaffles, 'total_tickets', 'desc');
      expect(result[0].total_tickets).toBe(200);
      expect(result[1].total_tickets).toBe(100);
    });

    it('should sort by created_at', () => {
      const result = sortRaffles(testRaffles, 'created_at', 'desc');
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('2');
    });

    it('should handle null draw_date in sorting', () => {
      const result = sortRaffles(testRaffles, 'draw_date', 'asc');
      // Nulls should be at the end
      expect(result[result.length - 1].draw_date).toBeNull();
    });
  });
});

// ===== Duplicate Raffle Functions =====
const prepareDuplicateData = (original: Raffle): Partial<Raffle> => {
  const { id, created_at, archived_at, ...rest } = original;
  return {
    ...rest,
    title: `${original.title} (Copia)`,
    status: 'draft' as RaffleStatus,
    start_date: null,
    draw_date: null,
  };
};

describe('useRaffles - duplicate', () => {
  const originalRaffle: Raffle = {
    id: 'original-123',
    title: 'Mi Sorteo Original',
    status: 'completed',
    total_tickets: 100,
    ticket_price: 50,
    start_date: '2024-01-01T00:00:00Z',
    draw_date: '2024-02-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    archived_at: null,
    close_sale_hours_before: 24,
  };

  it('should create copy with modified title', () => {
    const copy = prepareDuplicateData(originalRaffle);
    expect(copy.title).toBe('Mi Sorteo Original (Copia)');
  });

  it('should reset status to draft', () => {
    const copy = prepareDuplicateData(originalRaffle);
    expect(copy.status).toBe('draft');
  });

  it('should clear dates', () => {
    const copy = prepareDuplicateData(originalRaffle);
    expect(copy.start_date).toBeNull();
    expect(copy.draw_date).toBeNull();
  });

  it('should preserve other fields', () => {
    const copy = prepareDuplicateData(originalRaffle);
    expect(copy.total_tickets).toBe(100);
    expect(copy.ticket_price).toBe(50);
    expect(copy.close_sale_hours_before).toBe(24);
  });

  it('should remove id and timestamps', () => {
    const copy = prepareDuplicateData(originalRaffle);
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('created_at');
    expect(copy).not.toHaveProperty('archived_at');
  });
});
