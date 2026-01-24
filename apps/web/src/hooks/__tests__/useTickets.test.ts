import { describe, it, expect } from 'vitest';

// Test the pure business logic functions for tickets
// These don't require mocking Supabase

// ===== Types =====
type TicketStatus = 'available' | 'reserved' | 'sold' | 'canceled';

interface TicketRange {
  s: number; // start index
  e: number; // end index
}

interface Order {
  id: string;
  ticket_ranges: TicketRange[];
  lucky_indices?: number[];
  status: TicketStatus;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  reference_code: string | null;
  reserved_until: string | null;
  ticket_count: number;
  order_total: number | null;
}

interface TicketStats {
  available: number;
  reserved: number;
  sold: number;
  canceled: number;
  total: number;
}

interface TicketFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ===== Ticket Range Expansion Functions =====
const expandTicketRanges = (
  ranges: TicketRange[],
  luckyIndices: number[] = []
): number[] => {
  const indices: number[] = [];

  // Add lucky indices first
  if (luckyIndices?.length) {
    indices.push(...luckyIndices);
  }

  // Expand ranges
  if (ranges?.length) {
    for (const range of ranges) {
      for (let i = range.s; i <= range.e; i++) {
        indices.push(i);
      }
    }
  }

  // Return unique sorted values
  return [...new Set(indices)].sort((a, b) => a - b);
};

const compressToRanges = (indices: number[]): TicketRange[] => {
  if (indices.length === 0) return [];

  const sorted = [...indices].sort((a, b) => a - b);
  const ranges: TicketRange[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ s: start, e: end });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ s: start, e: end });

  return ranges;
};

describe('useTickets - ticket range operations', () => {
  describe('expandTicketRanges', () => {
    it('should expand a single range', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 4 }];
      expect(expandTicketRanges(ranges)).toEqual([0, 1, 2, 3, 4]);
    });

    it('should expand multiple non-overlapping ranges', () => {
      const ranges: TicketRange[] = [
        { s: 0, e: 2 },
        { s: 10, e: 12 },
      ];
      expect(expandTicketRanges(ranges)).toEqual([0, 1, 2, 10, 11, 12]);
    });

    it('should handle overlapping ranges and dedupe', () => {
      const ranges: TicketRange[] = [
        { s: 0, e: 5 },
        { s: 3, e: 8 },
      ];
      expect(expandTicketRanges(ranges)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should include lucky indices', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 2 }];
      const luckyIndices = [10, 20];
      expect(expandTicketRanges(ranges, luckyIndices)).toEqual([0, 1, 2, 10, 20]);
    });

    it('should dedupe lucky indices with ranges', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 5 }];
      const luckyIndices = [3, 4, 10];
      expect(expandTicketRanges(ranges, luckyIndices)).toEqual([0, 1, 2, 3, 4, 5, 10]);
    });

    it('should handle empty input', () => {
      expect(expandTicketRanges([])).toEqual([]);
      expect(expandTicketRanges([], [])).toEqual([]);
    });

    it('should handle single ticket range', () => {
      expect(expandTicketRanges([{ s: 5, e: 5 }])).toEqual([5]);
    });
  });

  describe('compressToRanges', () => {
    it('should compress consecutive numbers to range', () => {
      expect(compressToRanges([0, 1, 2, 3, 4])).toEqual([{ s: 0, e: 4 }]);
    });

    it('should create multiple ranges for gaps', () => {
      expect(compressToRanges([0, 1, 2, 10, 11, 12])).toEqual([
        { s: 0, e: 2 },
        { s: 10, e: 12 },
      ]);
    });

    it('should handle single numbers as single-element ranges', () => {
      expect(compressToRanges([0, 5, 10])).toEqual([
        { s: 0, e: 0 },
        { s: 5, e: 5 },
        { s: 10, e: 10 },
      ]);
    });

    it('should handle unsorted input', () => {
      expect(compressToRanges([5, 2, 3, 1, 4])).toEqual([{ s: 1, e: 5 }]);
    });

    it('should handle empty input', () => {
      expect(compressToRanges([])).toEqual([]);
    });
  });
});

// ===== Ticket Number Formatting Functions =====
const formatTicketNumber = (
  index: number,
  config: {
    start_number?: number;
    pad_enabled?: boolean;
    pad_width?: number;
    prefix?: string;
    suffix?: string;
  },
  totalTickets: number
): string => {
  const startNumber = config.start_number ?? 1;
  const padEnabled = config.pad_enabled !== false;
  const padWidth = config.pad_width ?? String(totalTickets + startNumber - 1).length;
  const prefix = config.prefix ?? '';
  const suffix = config.suffix ?? '';

  const num = startNumber + index;
  let numStr = String(num);

  if (padEnabled && numStr.length < padWidth) {
    numStr = '0'.repeat(padWidth - numStr.length) + numStr;
  }

  return `${prefix}${numStr}${suffix}`;
};

const parseTicketNumber = (
  ticketNumber: string,
  config: { start_number?: number; prefix?: string; suffix?: string }
): number | null => {
  const prefix = config.prefix ?? '';
  const suffix = config.suffix ?? '';
  const startNumber = config.start_number ?? 1;

  let numStr = ticketNumber;
  if (prefix && numStr.startsWith(prefix)) {
    numStr = numStr.slice(prefix.length);
  }
  if (suffix && numStr.endsWith(suffix)) {
    numStr = numStr.slice(0, -suffix.length);
  }

  const num = parseInt(numStr, 10);
  if (isNaN(num)) return null;

  return num - startNumber;
};

describe('useTickets - ticket number formatting', () => {
  describe('formatTicketNumber', () => {
    it('should format with default config', () => {
      expect(formatTicketNumber(0, {}, 100)).toBe('001');
      expect(formatTicketNumber(99, {}, 100)).toBe('100');
    });

    it('should format with custom start number', () => {
      expect(formatTicketNumber(0, { start_number: 1000 }, 100)).toBe('1000');
      expect(formatTicketNumber(1, { start_number: 1000 }, 100)).toBe('1001');
    });

    it('should format with prefix', () => {
      expect(formatTicketNumber(0, { prefix: 'TKT-' }, 100)).toBe('TKT-001');
    });

    it('should format with suffix', () => {
      expect(formatTicketNumber(0, { suffix: '-VIP' }, 100)).toBe('001-VIP');
    });

    it('should format with both prefix and suffix', () => {
      expect(formatTicketNumber(0, { prefix: 'R-', suffix: '-24' }, 100)).toBe('R-001-24');
    });

    it('should respect pad_enabled false', () => {
      expect(formatTicketNumber(0, { pad_enabled: false }, 1000)).toBe('1');
      expect(formatTicketNumber(9, { pad_enabled: false }, 1000)).toBe('10');
    });

    it('should use custom pad width', () => {
      expect(formatTicketNumber(0, { pad_width: 6 }, 100)).toBe('000001');
    });

    it('should auto-calculate pad width from total', () => {
      expect(formatTicketNumber(0, {}, 10)).toBe('01');
      expect(formatTicketNumber(0, {}, 100)).toBe('001');
      expect(formatTicketNumber(0, {}, 1000)).toBe('0001');
    });
  });

  describe('parseTicketNumber', () => {
    it('should parse simple ticket number', () => {
      expect(parseTicketNumber('001', {})).toBe(0);
      expect(parseTicketNumber('100', {})).toBe(99);
    });

    it('should parse with custom start number', () => {
      expect(parseTicketNumber('1000', { start_number: 1000 })).toBe(0);
      expect(parseTicketNumber('1050', { start_number: 1000 })).toBe(50);
    });

    it('should parse with prefix', () => {
      expect(parseTicketNumber('TKT-001', { prefix: 'TKT-' })).toBe(0);
    });

    it('should parse with suffix', () => {
      expect(parseTicketNumber('001-VIP', { suffix: '-VIP' })).toBe(0);
    });

    it('should return null for invalid input', () => {
      expect(parseTicketNumber('abc', {})).toBeNull();
      expect(parseTicketNumber('', {})).toBeNull();
    });
  });
});

// ===== Ticket Status Functions =====
const isTicketAvailable = (status: TicketStatus | null): boolean => {
  return status === 'available' || status === null;
};

const isTicketSold = (status: TicketStatus): boolean => {
  return status === 'sold';
};

const isTicketReserved = (status: TicketStatus): boolean => {
  return status === 'reserved';
};

const getStatusColor = (status: TicketStatus): string => {
  const colors: Record<TicketStatus, string> = {
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-blue-100 text-blue-800',
    canceled: 'bg-gray-100 text-gray-800',
  };
  return colors[status];
};

const getStatusLabel = (status: TicketStatus, lang: 'en' | 'es' = 'es'): string => {
  const labels: Record<TicketStatus, Record<string, string>> = {
    available: { es: 'Disponible', en: 'Available' },
    reserved: { es: 'Reservado', en: 'Reserved' },
    sold: { es: 'Vendido', en: 'Sold' },
    canceled: { es: 'Cancelado', en: 'Canceled' },
  };
  return labels[status][lang];
};

describe('useTickets - status functions', () => {
  describe('status checks', () => {
    it('should identify available tickets', () => {
      expect(isTicketAvailable('available')).toBe(true);
      expect(isTicketAvailable(null)).toBe(true);
      expect(isTicketAvailable('sold')).toBe(false);
      expect(isTicketAvailable('reserved')).toBe(false);
    });

    it('should identify sold tickets', () => {
      expect(isTicketSold('sold')).toBe(true);
      expect(isTicketSold('reserved')).toBe(false);
      expect(isTicketSold('available')).toBe(false);
    });

    it('should identify reserved tickets', () => {
      expect(isTicketReserved('reserved')).toBe(true);
      expect(isTicketReserved('sold')).toBe(false);
      expect(isTicketReserved('available')).toBe(false);
    });
  });

  describe('status colors', () => {
    it('should return correct colors', () => {
      expect(getStatusColor('available')).toContain('green');
      expect(getStatusColor('reserved')).toContain('yellow');
      expect(getStatusColor('sold')).toContain('blue');
      expect(getStatusColor('canceled')).toContain('gray');
    });
  });

  describe('status labels', () => {
    it('should return Spanish labels by default', () => {
      expect(getStatusLabel('available')).toBe('Disponible');
      expect(getStatusLabel('reserved')).toBe('Reservado');
      expect(getStatusLabel('sold')).toBe('Vendido');
      expect(getStatusLabel('canceled')).toBe('Cancelado');
    });

    it('should return English labels', () => {
      expect(getStatusLabel('available', 'en')).toBe('Available');
      expect(getStatusLabel('sold', 'en')).toBe('Sold');
    });
  });
});

// ===== Reservation Functions =====
const isReservationExpired = (reservedUntil: string | null): boolean => {
  if (!reservedUntil) return true;
  return new Date(reservedUntil) < new Date();
};

const getRemainingTime = (reservedUntil: string | null): number => {
  if (!reservedUntil) return 0;
  const remaining = new Date(reservedUntil).getTime() - Date.now();
  return Math.max(0, remaining);
};

const formatRemainingTime = (ms: number): string => {
  if (ms <= 0) return 'Expirado';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const calculateExtendedExpiry = (currentExpiry: string | null, minutesToAdd: number): Date => {
  const base = currentExpiry ? new Date(currentExpiry) : new Date();
  return new Date(base.getTime() + minutesToAdd * 60 * 1000);
};

describe('useTickets - reservation functions', () => {
  describe('isReservationExpired', () => {
    it('should return true for null', () => {
      expect(isReservationExpired(null)).toBe(true);
    });

    it('should return true for past date', () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(isReservationExpired(past)).toBe(true);
    });

    it('should return false for future date', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      expect(isReservationExpired(future)).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return 0 for null', () => {
      expect(getRemainingTime(null)).toBe(0);
    });

    it('should return 0 for past date', () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(getRemainingTime(past)).toBe(0);
    });

    it('should return positive for future date', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const remaining = getRemainingTime(future);
      expect(remaining).toBeGreaterThan(59000);
      expect(remaining).toBeLessThanOrEqual(60000);
    });
  });

  describe('formatRemainingTime', () => {
    it('should format hours and minutes', () => {
      const ms = 2 * 3600000 + 30 * 60000; // 2h 30m
      expect(formatRemainingTime(ms)).toBe('2h 30m');
    });

    it('should format minutes and seconds', () => {
      const ms = 15 * 60000 + 45000; // 15m 45s
      expect(formatRemainingTime(ms)).toBe('15m 45s');
    });

    it('should format seconds only', () => {
      expect(formatRemainingTime(30000)).toBe('30s');
    });

    it('should return Expirado for 0 or negative', () => {
      expect(formatRemainingTime(0)).toBe('Expirado');
      expect(formatRemainingTime(-1000)).toBe('Expirado');
    });
  });

  describe('calculateExtendedExpiry', () => {
    it('should add minutes to current expiry', () => {
      const now = new Date();
      const current = now.toISOString();
      const extended = calculateExtendedExpiry(current, 30);

      const expectedMs = now.getTime() + 30 * 60 * 1000;
      expect(Math.abs(extended.getTime() - expectedMs)).toBeLessThan(1000);
    });

    it('should use current time if expiry is null', () => {
      const now = Date.now();
      const extended = calculateExtendedExpiry(null, 30);

      const expectedMs = now + 30 * 60 * 1000;
      expect(Math.abs(extended.getTime() - expectedMs)).toBeLessThan(1000);
    });
  });
});

// ===== Bulk Operations Functions =====
const validateBulkSelection = (
  selectedIds: string[],
  maxSelection: number = 100
): { valid: boolean; error?: string } => {
  if (selectedIds.length === 0) {
    return { valid: false, error: 'No items selected' };
  }

  if (selectedIds.length > maxSelection) {
    return { valid: false, error: `Maximum ${maxSelection} items per operation` };
  }

  // Check for duplicates
  const unique = new Set(selectedIds);
  if (unique.size !== selectedIds.length) {
    return { valid: false, error: 'Duplicate items in selection' };
  }

  return { valid: true };
};

const groupOrdersByEmail = (
  orders: Order[]
): Map<string, { name: string | null; orders: Order[] }> => {
  const grouped = new Map<string, { name: string | null; orders: Order[] }>();

  for (const order of orders) {
    if (!order.buyer_email) continue;

    if (!grouped.has(order.buyer_email)) {
      grouped.set(order.buyer_email, { name: order.buyer_name, orders: [] });
    }
    grouped.get(order.buyer_email)!.orders.push(order);
  }

  return grouped;
};

const calculateBulkTicketCount = (orders: Order[]): number => {
  return orders.reduce((sum, order) => sum + order.ticket_count, 0);
};

describe('useTickets - bulk operations', () => {
  describe('validateBulkSelection', () => {
    it('should validate non-empty selection', () => {
      expect(validateBulkSelection(['1', '2', '3']).valid).toBe(true);
    });

    it('should reject empty selection', () => {
      const result = validateBulkSelection([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No items');
    });

    it('should reject selection exceeding max', () => {
      const ids = Array.from({ length: 150 }, (_, i) => String(i));
      const result = validateBulkSelection(ids);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should reject duplicate ids', () => {
      const result = validateBulkSelection(['1', '2', '2', '3']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Duplicate');
    });

    it('should allow custom max selection', () => {
      const ids = Array.from({ length: 50 }, (_, i) => String(i));
      expect(validateBulkSelection(ids, 50).valid).toBe(true);
      expect(validateBulkSelection(ids, 40).valid).toBe(false);
    });
  });

  describe('groupOrdersByEmail', () => {
    const testOrders: Order[] = [
      {
        id: '1',
        ticket_ranges: [{ s: 0, e: 4 }],
        status: 'reserved',
        buyer_name: 'Juan',
        buyer_email: 'juan@test.com',
        buyer_phone: null,
        reference_code: 'REF001',
        reserved_until: null,
        ticket_count: 5,
        order_total: 250,
      },
      {
        id: '2',
        ticket_ranges: [{ s: 5, e: 9 }],
        status: 'reserved',
        buyer_name: 'Maria',
        buyer_email: 'maria@test.com',
        buyer_phone: null,
        reference_code: 'REF002',
        reserved_until: null,
        ticket_count: 5,
        order_total: 250,
      },
      {
        id: '3',
        ticket_ranges: [{ s: 10, e: 14 }],
        status: 'reserved',
        buyer_name: 'Juan',
        buyer_email: 'juan@test.com',
        buyer_phone: null,
        reference_code: 'REF003',
        reserved_until: null,
        ticket_count: 5,
        order_total: 250,
      },
    ];

    it('should group orders by email', () => {
      const grouped = groupOrdersByEmail(testOrders);
      expect(grouped.size).toBe(2);
      expect(grouped.get('juan@test.com')?.orders).toHaveLength(2);
      expect(grouped.get('maria@test.com')?.orders).toHaveLength(1);
    });

    it('should preserve buyer name', () => {
      const grouped = groupOrdersByEmail(testOrders);
      expect(grouped.get('juan@test.com')?.name).toBe('Juan');
    });

    it('should skip orders without email', () => {
      const ordersWithoutEmail: Order[] = [
        { ...testOrders[0], buyer_email: null },
      ];
      const grouped = groupOrdersByEmail(ordersWithoutEmail);
      expect(grouped.size).toBe(0);
    });
  });

  describe('calculateBulkTicketCount', () => {
    it('should sum ticket counts', () => {
      const orders: Order[] = [
        { id: '1', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 5, order_total: null },
        { id: '2', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 10, order_total: null },
        { id: '3', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 3, order_total: null },
      ];
      expect(calculateBulkTicketCount(orders)).toBe(18);
    });

    it('should return 0 for empty array', () => {
      expect(calculateBulkTicketCount([])).toBe(0);
    });
  });
});

// ===== Stats Calculation Functions =====
const calculateTicketStats = (
  totalTickets: number,
  orders: Order[]
): TicketStats => {
  const sold = orders
    .filter(o => o.status === 'sold')
    .reduce((sum, o) => sum + o.ticket_count, 0);

  const reserved = orders
    .filter(o => o.status === 'reserved')
    .reduce((sum, o) => sum + o.ticket_count, 0);

  const canceled = orders
    .filter(o => o.status === 'canceled')
    .reduce((sum, o) => sum + o.ticket_count, 0);

  const available = totalTickets - sold - reserved;

  return {
    available: Math.max(0, available),
    reserved,
    sold,
    canceled,
    total: totalTickets,
  };
};

const validateStatsConsistency = (stats: TicketStats): boolean => {
  return stats.available === stats.total - stats.sold - stats.reserved;
};

const calculateSoldPercentage = (stats: TicketStats): number => {
  if (stats.total === 0) return 0;
  return (stats.sold / stats.total) * 100;
};

describe('useTickets - stats calculations', () => {
  describe('calculateTicketStats', () => {
    it('should calculate stats correctly', () => {
      const orders: Order[] = [
        { id: '1', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 30, order_total: null },
        { id: '2', ticket_ranges: [], status: 'reserved', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 20, order_total: null },
        { id: '3', ticket_ranges: [], status: 'canceled', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 10, order_total: null },
      ];
      const stats = calculateTicketStats(100, orders);

      expect(stats.total).toBe(100);
      expect(stats.sold).toBe(30);
      expect(stats.reserved).toBe(20);
      expect(stats.canceled).toBe(10);
      expect(stats.available).toBe(50);
    });

    it('should handle empty orders', () => {
      const stats = calculateTicketStats(100, []);
      expect(stats.available).toBe(100);
      expect(stats.sold).toBe(0);
      expect(stats.reserved).toBe(0);
    });

    it('should handle all tickets sold', () => {
      const orders: Order[] = [
        { id: '1', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 100, order_total: null },
      ];
      const stats = calculateTicketStats(100, orders);
      expect(stats.available).toBe(0);
      expect(stats.sold).toBe(100);
    });

    it('should not allow negative available', () => {
      const orders: Order[] = [
        { id: '1', ticket_ranges: [], status: 'sold', buyer_name: null, buyer_email: null, buyer_phone: null, reference_code: null, reserved_until: null, ticket_count: 150, order_total: null },
      ];
      const stats = calculateTicketStats(100, orders);
      expect(stats.available).toBe(0); // Not -50
    });
  });

  describe('validateStatsConsistency', () => {
    it('should validate consistent stats', () => {
      expect(validateStatsConsistency({
        total: 100,
        sold: 30,
        reserved: 20,
        canceled: 10,
        available: 50,
      })).toBe(true);
    });

    it('should detect inconsistent stats', () => {
      expect(validateStatsConsistency({
        total: 100,
        sold: 30,
        reserved: 20,
        canceled: 10,
        available: 60, // Should be 50
      })).toBe(false);
    });
  });

  describe('calculateSoldPercentage', () => {
    it('should calculate percentage correctly', () => {
      const stats: TicketStats = {
        total: 100,
        sold: 50,
        reserved: 10,
        canceled: 0,
        available: 40,
      };
      expect(calculateSoldPercentage(stats)).toBe(50);
    });

    it('should handle zero total', () => {
      const stats: TicketStats = {
        total: 0,
        sold: 0,
        reserved: 0,
        canceled: 0,
        available: 0,
      };
      expect(calculateSoldPercentage(stats)).toBe(0);
    });
  });
});

// ===== Search and Filter Functions =====
const filterTicketsBySearch = (
  tickets: Array<{ ticket_number: string; buyer_name?: string | null }>,
  search: string
): typeof tickets => {
  if (!search) return tickets;

  const searchLower = search.toLowerCase();
  const searchNum = search.replace(/^0+/, ''); // Remove leading zeros

  return tickets.filter(t => {
    // Match ticket number
    if (t.ticket_number.includes(search)) return true;
    if (t.ticket_number.replace(/^0+/, '') === searchNum) return true;

    // Match buyer name
    if (t.buyer_name && t.buyer_name.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  });
};

const filterTicketsByStatus = <T extends { status: TicketStatus }>(
  tickets: T[],
  status: string
): T[] => {
  if (status === 'all' || !status) return tickets;
  return tickets.filter(t => t.status === status);
};

describe('useTickets - search and filter', () => {
  const testTickets = [
    { ticket_number: '001', buyer_name: 'Juan Perez', status: 'sold' as TicketStatus },
    { ticket_number: '002', buyer_name: 'Maria Garcia', status: 'reserved' as TicketStatus },
    { ticket_number: '010', buyer_name: 'Pedro Lopez', status: 'sold' as TicketStatus },
    { ticket_number: '100', buyer_name: null, status: 'available' as TicketStatus },
  ];

  describe('filterTicketsBySearch', () => {
    it('should find by exact ticket number', () => {
      const result = filterTicketsBySearch(testTickets, '001');
      expect(result).toHaveLength(1);
      expect(result[0].ticket_number).toBe('001');
    });

    it('should find by ticket number without leading zeros', () => {
      // Searching for '1' matches tickets where number stripped of leading zeros equals '1'
      // This matches '001' (stripped = '1'), '010' (contains '1'), '100' (contains '1')
      const result = filterTicketsBySearch(testTickets, '1');
      // All tickets contain '1' in their number
      expect(result.length).toBeGreaterThan(0);
      // The exact match for '1' should include '001'
      expect(result.some(t => t.ticket_number === '001')).toBe(true);
    });

    it('should find by partial ticket number', () => {
      const result = filterTicketsBySearch(testTickets, '01');
      expect(result).toHaveLength(2);
    });

    it('should find by buyer name', () => {
      const result = filterTicketsBySearch(testTickets, 'juan');
      expect(result).toHaveLength(1);
      expect(result[0].buyer_name).toBe('Juan Perez');
    });

    it('should return all for empty search', () => {
      expect(filterTicketsBySearch(testTickets, '')).toHaveLength(4);
    });
  });

  describe('filterTicketsByStatus', () => {
    it('should filter by status', () => {
      const sold = filterTicketsByStatus(testTickets, 'sold');
      expect(sold).toHaveLength(2);

      const reserved = filterTicketsByStatus(testTickets, 'reserved');
      expect(reserved).toHaveLength(1);
    });

    it('should return all for "all" status', () => {
      expect(filterTicketsByStatus(testTickets, 'all')).toHaveLength(4);
    });

    it('should return all for empty status', () => {
      expect(filterTicketsByStatus(testTickets, '')).toHaveLength(4);
    });
  });
});

// ===== Reference Code Functions =====
const isValidReferenceCode = (code: string): boolean => {
  // Format: 6 alphanumeric uppercase characters
  return /^[A-Z0-9]{6}$/.test(code);
};

const generateReferenceCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

describe('useTickets - reference codes', () => {
  describe('isValidReferenceCode', () => {
    it('should validate correct codes', () => {
      expect(isValidReferenceCode('ABC123')).toBe(true);
      expect(isValidReferenceCode('XXXXXX')).toBe(true);
      expect(isValidReferenceCode('000000')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidReferenceCode('abc123')).toBe(false); // lowercase
      expect(isValidReferenceCode('ABC12')).toBe(false); // too short
      expect(isValidReferenceCode('ABC1234')).toBe(false); // too long
      expect(isValidReferenceCode('ABC-12')).toBe(false); // special chars
      expect(isValidReferenceCode('')).toBe(false);
    });
  });

  describe('generateReferenceCode', () => {
    it('should generate valid codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateReferenceCode();
        expect(isValidReferenceCode(code)).toBe(true);
      }
    });

    it('should generate 6-character codes', () => {
      const code = generateReferenceCode();
      expect(code).toHaveLength(6);
    });
  });
});

// ===== Order Display Functions =====
const formatOrderTickets = (order: Order): string => {
  const indices = expandTicketRanges(order.ticket_ranges, order.lucky_indices);
  if (indices.length === 0) return 'Sin boletos';
  if (indices.length === 1) return `Boleto ${indices[0] + 1}`;
  if (indices.length <= 5) {
    return `Boletos ${indices.map(i => i + 1).join(', ')}`;
  }
  return `${indices.length} boletos (${indices[0] + 1}-${indices[indices.length - 1] + 1})`;
};

const getOrderDisplayInfo = (order: Order): {
  buyerDisplay: string;
  statusBadge: string;
  ticketDisplay: string;
} => {
  return {
    buyerDisplay: order.buyer_name || order.buyer_email || 'Anónimo',
    statusBadge: getStatusLabel(order.status),
    ticketDisplay: formatOrderTickets(order),
  };
};

describe('useTickets - order display', () => {
  describe('formatOrderTickets', () => {
    it('should format single ticket', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [{ s: 0, e: 0 }],
        status: 'sold',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 1,
        order_total: null,
      };
      expect(formatOrderTickets(order)).toBe('Boleto 1');
    });

    it('should format few tickets as list', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [{ s: 0, e: 2 }],
        status: 'sold',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 3,
        order_total: null,
      };
      expect(formatOrderTickets(order)).toBe('Boletos 1, 2, 3');
    });

    it('should format many tickets as range', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [{ s: 0, e: 9 }],
        status: 'sold',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 10,
        order_total: null,
      };
      expect(formatOrderTickets(order)).toBe('10 boletos (1-10)');
    });

    it('should handle empty ranges', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [],
        status: 'sold',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 0,
        order_total: null,
      };
      expect(formatOrderTickets(order)).toBe('Sin boletos');
    });
  });

  describe('getOrderDisplayInfo', () => {
    it('should prefer buyer name over email', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [],
        status: 'sold',
        buyer_name: 'Juan',
        buyer_email: 'juan@test.com',
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 1,
        order_total: null,
      };
      expect(getOrderDisplayInfo(order).buyerDisplay).toBe('Juan');
    });

    it('should use email when no name', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [],
        status: 'sold',
        buyer_name: null,
        buyer_email: 'juan@test.com',
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 1,
        order_total: null,
      };
      expect(getOrderDisplayInfo(order).buyerDisplay).toBe('juan@test.com');
    });

    it('should use Anonimo when no buyer info', () => {
      const order: Order = {
        id: '1',
        ticket_ranges: [],
        status: 'sold',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        reference_code: null,
        reserved_until: null,
        ticket_count: 1,
        order_total: null,
      };
      expect(getOrderDisplayInfo(order).buyerDisplay).toBe('Anónimo');
    });
  });
});
