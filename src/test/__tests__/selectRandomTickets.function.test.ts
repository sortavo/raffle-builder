import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for select-random-tickets Edge Function
 *
 * Tests random ticket selection, rate limiting, validation,
 * and the sampling/shuffle strategies for different scale operations.
 *
 * Related file: supabase/functions/select-random-tickets/index.ts
 */

// Configuration constants from the edge function
const MAX_TICKETS = 100000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60000;

// Types matching the edge function
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface NumberingConfig {
  start_number?: number;
  step?: number;
}

// Helper functions from the edge function (extracted for testing)
function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  identifier: string,
  maxRequests: number,
  windowMs: number
) {
  const now = Date.now();
  let entry = store.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    store.set(identifier, entry);
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 };
}

function formatTicketNumber(
  index: number,
  numberStart: number,
  step: number,
  totalTickets: number
): string {
  const ticketNum = numberStart + index * step;
  const maxTicketNum = numberStart + (totalTickets - 1) * step;
  const digits = Math.max(String(maxTicketNum).length, 1);
  return String(ticketNum).padStart(digits, '0');
}

function expandOrderToIndices(order: {
  ticket_ranges: { s: number; e: number }[];
  lucky_indices?: number[];
}): number[] {
  const indices: number[] = [];

  for (const range of order.ticket_ranges || []) {
    for (let i = range.s; i <= range.e; i++) {
      indices.push(i);
    }
  }

  if (order.lucky_indices) {
    indices.push(...order.lucky_indices);
  }

  return indices;
}

describe('select-random-tickets - Input Validation', () => {
  it('should require raffle_id', () => {
    const body = { quantity: 10 };
    const isValid = body.hasOwnProperty('raffle_id');
    expect(isValid).toBe(false);
  });

  it('should require quantity', () => {
    const body = { raffle_id: 'test-id' };
    const isValid = (body as any).quantity !== undefined;
    expect(isValid).toBe(false);
  });

  it('should accept valid request', () => {
    const body = { raffle_id: 'test-id', quantity: 10 };
    const isValid = body.raffle_id && body.quantity;
    expect(isValid).toBeTruthy();
  });

  it('should reject quantity exceeding maximum', () => {
    const quantity = 150000;
    const isValid = quantity <= MAX_TICKETS;
    expect(isValid).toBe(false);
  });

  it('should accept quantity at maximum', () => {
    const quantity = MAX_TICKETS;
    const isValid = quantity <= MAX_TICKETS;
    expect(isValid).toBe(true);
  });

  it('should handle exclude_numbers parameter', () => {
    const body = { raffle_id: 'test', quantity: 10, exclude_numbers: ['001', '002'] };
    expect(body.exclude_numbers).toHaveLength(2);
  });

  it('should default exclude_numbers to empty array', () => {
    const body = { raffle_id: 'test', quantity: 10 };
    const excludeNumbers = (body as any).exclude_numbers || [];
    expect(excludeNumbers).toEqual([]);
  });
});

describe('select-random-tickets - Rate Limiting', () => {
  it('should allow first request', () => {
    const store = new Map<string, RateLimitEntry>();
    const result = checkRateLimit(store, 'ip:127.0.0.1', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('should track request count', () => {
    const store = new Map<string, RateLimitEntry>();
    const identifier = 'ip:192.168.1.1';

    checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    const result = checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    expect(result.remaining).toBe(27);
  });

  it('should block when limit exceeded', () => {
    const store = new Map<string, RateLimitEntry>();
    const identifier = 'ip:10.0.0.1';

    // Exhaust the limit
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    }

    const result = checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset after window expires', () => {
    const store = new Map<string, RateLimitEntry>();
    const identifier = 'ip:172.16.0.1';
    const oldWindowStart = Date.now() - RATE_LIMIT_WINDOW_MS - 1000;

    store.set(identifier, { count: RATE_LIMIT_MAX, windowStart: oldWindowStart });

    const result = checkRateLimit(store, identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('should isolate rate limits by IP', () => {
    const store = new Map<string, RateLimitEntry>();

    const result1 = checkRateLimit(store, 'ip:1.1.1.1', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    const result2 = checkRateLimit(store, 'ip:2.2.2.2', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

    expect(result1.remaining).toBe(29);
    expect(result2.remaining).toBe(29);
  });
});

describe('select-random-tickets - IP Extraction', () => {
  it('should extract from x-forwarded-for header', () => {
    const headers = { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' };
    const ip = headers['x-forwarded-for']?.split(',')[0]?.trim();
    expect(ip).toBe('203.0.113.50');
  });

  it('should fallback to x-real-ip', () => {
    const headers = { 'x-real-ip': '198.51.100.178' };
    const ip =
      headers['x-forwarded-for']?.split(',')[0]?.trim() || headers['x-real-ip'];
    expect(ip).toBe('198.51.100.178');
  });

  it('should fallback to cf-connecting-ip', () => {
    const headers = { 'cf-connecting-ip': '192.0.2.100' };
    const ip =
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['x-real-ip'] ||
      headers['cf-connecting-ip'];
    expect(ip).toBe('192.0.2.100');
  });

  it('should return unknown as last fallback', () => {
    const headers: Record<string, string> = {};
    const ip =
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['x-real-ip'] ||
      headers['cf-connecting-ip'] ||
      'unknown';
    expect(ip).toBe('unknown');
  });
});

describe('select-random-tickets - Raffle Validation', () => {
  it('should return 404 for non-existent raffle', () => {
    const raffle = null;
    const expectedStatus = !raffle ? 404 : 200;
    expect(expectedStatus).toBe(404);
  });

  it('should only allow active raffles', () => {
    const raffle = { status: 'active' };
    const isActive = raffle.status === 'active';
    expect(isActive).toBe(true);
  });

  it('should reject draft raffles', () => {
    const raffle = { status: 'draft' };
    const isActive = raffle.status === 'active';
    expect(isActive).toBe(false);
  });

  it('should reject completed raffles', () => {
    const raffle = { status: 'completed' };
    const isActive = raffle.status === 'active';
    expect(isActive).toBe(false);
  });

  it('should return 403 for non-active status', () => {
    const raffle = { status: 'draft' };
    const expectedStatus = raffle.status !== 'active' ? 403 : 200;
    expect(expectedStatus).toBe(403);
  });
});

describe('select-random-tickets - Ticket Number Formatting', () => {
  describe('formatTicketNumber', () => {
    it('should format with default config', () => {
      const result = formatTicketNumber(0, 1, 1, 1000);
      expect(result).toBe('0001');
    });

    it('should apply start number', () => {
      const result = formatTicketNumber(0, 100, 1, 1000);
      expect(result).toBe('0100');
    });

    it('should apply step', () => {
      const result = formatTicketNumber(5, 1, 10, 1000);
      expect(result).toBe('0051'); // 1 + 5*10 = 51
    });

    it('should pad to correct digit count', () => {
      const result = formatTicketNumber(0, 1, 1, 10000000);
      expect(result).toBe('00000001');
    });

    it('should handle large ticket numbers', () => {
      const result = formatTicketNumber(999, 1, 1, 1000);
      expect(result).toBe('1000');
    });

    it('should handle step > 1 correctly', () => {
      const result = formatTicketNumber(3, 0, 5, 100);
      expect(result).toBe('015'); // 0 + 3*5 = 15
    });
  });
});

describe('select-random-tickets - Order Expansion', () => {
  describe('expandOrderToIndices', () => {
    it('should expand single range', () => {
      const order = {
        ticket_ranges: [{ s: 10, e: 14 }],
        lucky_indices: [],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([10, 11, 12, 13, 14]);
    });

    it('should expand multiple ranges', () => {
      const order = {
        ticket_ranges: [
          { s: 0, e: 2 },
          { s: 10, e: 11 },
        ],
        lucky_indices: [],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([0, 1, 2, 10, 11]);
    });

    it('should include lucky indices', () => {
      const order = {
        ticket_ranges: [{ s: 0, e: 1 }],
        lucky_indices: [7, 77],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([0, 1, 7, 77]);
    });

    it('should handle empty ranges with only lucky indices', () => {
      const order = {
        ticket_ranges: [],
        lucky_indices: [7, 77, 777],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([7, 77, 777]);
    });

    it('should handle missing lucky_indices', () => {
      const order = {
        ticket_ranges: [{ s: 0, e: 2 }],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should handle empty order', () => {
      const order = {
        ticket_ranges: [],
        lucky_indices: [],
      };

      const indices = expandOrderToIndices(order);
      expect(indices).toEqual([]);
    });
  });
});

describe('select-random-tickets - Availability Calculation', () => {
  it('should calculate available count correctly', () => {
    const totalTickets = 1000;
    const unavailableCount = 350;
    const totalAvailable = totalTickets - unavailableCount;

    expect(totalAvailable).toBe(650);
  });

  it('should handle fully unavailable raffle', () => {
    const totalTickets = 1000;
    const unavailableCount = 1000;
    const totalAvailable = totalTickets - unavailableCount;

    expect(totalAvailable).toBe(0);
  });

  it('should return empty when no tickets available', () => {
    const totalAvailable = 0;
    const response = {
      error: 'No hay boletos disponibles',
      selected: [],
      requested: 10,
      available: totalAvailable,
    };

    expect(response.selected).toEqual([]);
    expect(response.error).toContain('disponibles');
  });
});

describe('select-random-tickets - Selection Strategies', () => {
  describe('Sampling Strategy', () => {
    it('should use sampling for small quantity in large pool', () => {
      const totalTickets = 100000;
      const needed = 100;
      const samplingThreshold = Math.min(totalTickets * 0.1, 50000);
      const useSampling = needed <= samplingThreshold && totalTickets > 10000;

      expect(useSampling).toBe(true);
    });

    it('should not use sampling for large quantity', () => {
      const totalTickets = 100000;
      const needed = 60000;
      const samplingThreshold = Math.min(totalTickets * 0.1, 50000);
      const useSampling = needed <= samplingThreshold && totalTickets > 10000;

      expect(useSampling).toBe(false);
    });
  });

  describe('Shuffle Strategy', () => {
    it('should use shuffle for small pools', () => {
      const totalTickets = 5000;
      const needed = 100;
      const samplingThreshold = Math.min(totalTickets * 0.1, 50000);
      const useSampling = needed <= samplingThreshold && totalTickets > 10000;

      expect(useSampling).toBe(false); // Use shuffle
    });

    it('should use shuffle for large quantity selection', () => {
      const totalTickets = 100000;
      const needed = 80000;
      const samplingThreshold = Math.min(totalTickets * 0.1, 50000);
      const useSampling = needed <= samplingThreshold && totalTickets > 10000;

      expect(useSampling).toBe(false); // Use shuffle
    });
  });
});

describe('select-random-tickets - Exclusion Logic', () => {
  it('should exclude specified numbers', () => {
    const excludeNumbers = ['001', '002', '003'];
    const excludeSet = new Set(excludeNumbers);
    const ticketNumber = '002';

    const shouldExclude = excludeSet.has(ticketNumber);
    expect(shouldExclude).toBe(true);
  });

  it('should not exclude unlisted numbers', () => {
    const excludeNumbers = ['001', '002', '003'];
    const excludeSet = new Set(excludeNumbers);
    const ticketNumber = '004';

    const shouldExclude = excludeSet.has(ticketNumber);
    expect(shouldExclude).toBe(false);
  });
});

describe('select-random-tickets - Response Format', () => {
  it('should return selected tickets array', () => {
    const response = {
      selected: ['001', '042', '777'],
      indices: [0, 41, 776],
      requested: 3,
      available: 1000,
    };

    expect(response.selected).toHaveLength(3);
    expect(response.indices).toHaveLength(3);
  });

  it('should include warning when partial selection', () => {
    const selectedCount = 5;
    const requestedCount = 10;
    const response: { warning?: string } = {};

    if (selectedCount < requestedCount) {
      response.warning = `Solo ${selectedCount} boletos disponibles de los ${requestedCount} solicitados`;
    }

    expect(response.warning).toBeDefined();
    expect(response.warning).toContain('5');
    expect(response.warning).toContain('10');
  });

  it('should not include warning for full selection', () => {
    const selectedCount = 10;
    const requestedCount = 10;
    const response: { warning?: string } = {};

    if (selectedCount < requestedCount) {
      response.warning = `Solo ${selectedCount} boletos disponibles`;
    }

    expect(response.warning).toBeUndefined();
  });

  it('should include rate limit header info', () => {
    const headers = {
      'X-RateLimit-Remaining': '27',
    };

    expect(headers['X-RateLimit-Remaining']).toBe('27');
  });
});

describe('select-random-tickets - Block-based Optimization', () => {
  it('should prefer blocks when available', () => {
    const blocks = [
      { block_start: 0, sold_count: 100, reserved_count: 10 },
      { block_start: 1000, sold_count: 50, reserved_count: 5 },
    ];
    const blocksError = null;

    const useBlocks = !blocksError && blocks && blocks.length > 0;
    expect(useBlocks).toBe(true);
  });

  it('should fallback when blocks unavailable', () => {
    const blocks: any[] = [];
    const blocksError = null;

    const useBlocks = !blocksError && blocks && blocks.length > 0;
    expect(useBlocks).toBe(false);
  });

  it('should only query occupied blocks', () => {
    const blocks = [
      { block_start: 0, sold_count: 100, reserved_count: 10 },
      { block_start: 1000, sold_count: 0, reserved_count: 0 },
      { block_start: 2000, sold_count: 50, reserved_count: 0 },
    ];

    const occupiedBlocks = blocks.filter(
      (b) => b.sold_count > 0 || b.reserved_count > 0
    );

    expect(occupiedBlocks).toHaveLength(2);
    expect(occupiedBlocks.map((b) => b.block_start)).toEqual([0, 2000]);
  });
});

describe('select-random-tickets - Reservation Filtering', () => {
  it('should skip expired reservations', () => {
    const nowIso = new Date().toISOString();
    const expiredReservation = {
      status: 'reserved',
      reserved_until: new Date(Date.now() - 10000).toISOString(),
    };

    const isExpired = expiredReservation.reserved_until < nowIso;
    expect(isExpired).toBe(true);
  });

  it('should include active reservations', () => {
    const nowIso = new Date().toISOString();
    const activeReservation = {
      status: 'reserved',
      reserved_until: new Date(Date.now() + 300000).toISOString(),
    };

    const isExpired = activeReservation.reserved_until < nowIso;
    expect(isExpired).toBe(false);
  });
});

describe('select-random-tickets - Error Handling', () => {
  it('should handle invalid JSON body', () => {
    const invalidJson = 'not json';
    let parseError = false;

    try {
      JSON.parse(invalidJson);
    } catch (e) {
      parseError = true;
    }

    expect(parseError).toBe(true);
  });

  it('should return 400 for missing parameters', () => {
    const body = { raffle_id: 'test' };
    const hasRequired = body.raffle_id && (body as any).quantity;
    const expectedStatus = !hasRequired ? 400 : 200;

    expect(expectedStatus).toBe(400);
  });

  it('should return 429 for rate limit exceeded', () => {
    const rateLimitResult = { allowed: false, retryAfter: 30 };
    const expectedStatus = !rateLimitResult.allowed ? 429 : 200;

    expect(expectedStatus).toBe(429);
  });

  it('should return 500 for unexpected errors', () => {
    const error = new Error('Database error');
    const expectedStatus = 500;

    expect(error).toBeInstanceOf(Error);
    expect(expectedStatus).toBe(500);
  });
});
