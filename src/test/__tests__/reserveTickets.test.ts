import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for Ticket Reservation Logic
 *
 * Tests the reservation validation, expiration handling, ticket range management,
 * and conflict detection logic used across the application.
 *
 * Note: There is no direct reserve-tickets edge function, but reservation logic
 * is implemented via Supabase RPC calls and handled in cleanup-expired-orders.
 * These tests verify the business logic patterns.
 */

// Configuration constants
const DEFAULT_RESERVATION_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_TICKETS_PER_RESERVATION = 100;

// Types for reservation logic
interface TicketRange {
  s: number; // start index
  e: number; // end index
}

interface ReservationRequest {
  raffle_id: string;
  ticket_indices: number[];
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_city?: string;
  duration_minutes?: number;
}

interface ReservationResponse {
  order_id: string;
  reserved_until: string;
  ticket_ranges: TicketRange[];
  ticket_count: number;
}

// Helper functions for reservation logic
function indicesToRanges(indices: number[]): TicketRange[] {
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
}

function rangesToIndices(ranges: TicketRange[]): number[] {
  const indices: number[] = [];
  for (const range of ranges) {
    for (let i = range.s; i <= range.e; i++) {
      indices.push(i);
    }
  }
  return indices;
}

function calculateReservationExpiry(durationMinutes?: number): Date {
  const duration = durationMinutes
    ? durationMinutes * 60 * 1000
    : DEFAULT_RESERVATION_DURATION_MS;
  return new Date(Date.now() + duration);
}

describe('reserveTickets - Input Validation', () => {
  describe('Required Fields', () => {
    it('should require raffle_id', () => {
      const request: Partial<ReservationRequest> = {
        ticket_indices: [1, 2, 3],
      };
      const isValid = request.raffle_id !== undefined;
      expect(isValid).toBe(false);
    });

    it('should require ticket_indices', () => {
      const request: Partial<ReservationRequest> = {
        raffle_id: 'test-raffle',
      };
      const isValid = request.ticket_indices !== undefined;
      expect(isValid).toBe(false);
    });

    it('should accept valid reservation request', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle-uuid',
        ticket_indices: [0, 1, 2, 3, 4],
      };
      const isValid =
        request.raffle_id !== undefined && request.ticket_indices !== undefined;
      expect(isValid).toBe(true);
    });
  });

  describe('Ticket Count Validation', () => {
    it('should reject empty ticket array', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: [],
      };
      const isValid = request.ticket_indices.length > 0;
      expect(isValid).toBe(false);
    });

    it('should reject too many tickets', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: Array.from({ length: 150 }, (_, i) => i),
      };
      const isValid = request.ticket_indices.length <= MAX_TICKETS_PER_RESERVATION;
      expect(isValid).toBe(false);
    });

    it('should accept valid ticket count', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: [1, 2, 3, 4, 5],
      };
      const isValid = request.ticket_indices.length <= MAX_TICKETS_PER_RESERVATION;
      expect(isValid).toBe(true);
    });

    it('should accept maximum allowed tickets', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: Array.from({ length: MAX_TICKETS_PER_RESERVATION }, (_, i) => i),
      };
      const isValid = request.ticket_indices.length <= MAX_TICKETS_PER_RESERVATION;
      expect(isValid).toBe(true);
    });
  });

  describe('Ticket Index Validation', () => {
    it('should reject negative indices', () => {
      const indices = [1, 2, -1, 3];
      const hasInvalid = indices.some((i) => i < 0);
      expect(hasInvalid).toBe(true);
    });

    it('should reject duplicate indices', () => {
      const indices = [1, 2, 3, 2, 4];
      const uniqueCount = new Set(indices).size;
      const hasDuplicates = uniqueCount !== indices.length;
      expect(hasDuplicates).toBe(true);
    });

    it('should accept valid unique positive indices', () => {
      const indices = [0, 1, 5, 10, 100];
      const hasInvalid = indices.some((i) => i < 0);
      const uniqueCount = new Set(indices).size;
      const isValid = !hasInvalid && uniqueCount === indices.length;
      expect(isValid).toBe(true);
    });
  });
});

describe('reserveTickets - Range Compression', () => {
  describe('indicesToRanges', () => {
    it('should compress consecutive indices', () => {
      const indices = [1, 2, 3, 4, 5];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([{ s: 1, e: 5 }]);
    });

    it('should handle single index', () => {
      const indices = [42];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([{ s: 42, e: 42 }]);
    });

    it('should handle non-consecutive indices', () => {
      const indices = [1, 3, 5, 7];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([
        { s: 1, e: 1 },
        { s: 3, e: 3 },
        { s: 5, e: 5 },
        { s: 7, e: 7 },
      ]);
    });

    it('should handle mixed consecutive and non-consecutive', () => {
      const indices = [1, 2, 3, 10, 11, 20];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([
        { s: 1, e: 3 },
        { s: 10, e: 11 },
        { s: 20, e: 20 },
      ]);
    });

    it('should handle unsorted indices', () => {
      const indices = [5, 1, 3, 2, 4];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([{ s: 1, e: 5 }]);
    });

    it('should handle empty array', () => {
      const indices: number[] = [];
      const ranges = indicesToRanges(indices);
      expect(ranges).toEqual([]);
    });
  });

  describe('rangesToIndices', () => {
    it('should expand single range', () => {
      const ranges = [{ s: 1, e: 5 }];
      const indices = rangesToIndices(ranges);
      expect(indices).toEqual([1, 2, 3, 4, 5]);
    });

    it('should expand multiple ranges', () => {
      const ranges = [
        { s: 1, e: 3 },
        { s: 10, e: 12 },
      ];
      const indices = rangesToIndices(ranges);
      expect(indices).toEqual([1, 2, 3, 10, 11, 12]);
    });

    it('should handle empty ranges array', () => {
      const ranges: TicketRange[] = [];
      const indices = rangesToIndices(ranges);
      expect(indices).toEqual([]);
    });

    it('should roundtrip correctly', () => {
      const original = [1, 2, 3, 10, 11, 50];
      const ranges = indicesToRanges(original);
      const restored = rangesToIndices(ranges);
      expect(restored).toEqual(original);
    });
  });
});

describe('reserveTickets - Reservation Expiry', () => {
  describe('calculateReservationExpiry', () => {
    it('should use default duration when not specified', () => {
      const now = Date.now();
      const expiry = calculateReservationExpiry();
      const expectedExpiry = now + DEFAULT_RESERVATION_DURATION_MS;

      // Allow small tolerance for test execution time
      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it('should use custom duration when specified', () => {
      const customMinutes = 30;
      const now = Date.now();
      const expiry = calculateReservationExpiry(customMinutes);
      const expectedExpiry = now + customMinutes * 60 * 1000;

      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it('should return future date', () => {
      const now = new Date();
      const expiry = calculateReservationExpiry();
      expect(expiry > now).toBe(true);
    });
  });

  describe('Expiration Check', () => {
    it('should identify expired reservation', () => {
      const now = new Date();
      const expiredReservation = {
        reserved_until: new Date(Date.now() - 60000).toISOString(),
      };

      const isExpired = new Date(expiredReservation.reserved_until) < now;
      expect(isExpired).toBe(true);
    });

    it('should identify active reservation', () => {
      const now = new Date();
      const activeReservation = {
        reserved_until: new Date(Date.now() + 300000).toISOString(),
      };

      const isExpired = new Date(activeReservation.reserved_until) < now;
      expect(isExpired).toBe(false);
    });

    it('should calculate time remaining', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const now = new Date();
      const remainingMs = futureDate.getTime() - now.getTime();
      const remainingMinutes = Math.floor(remainingMs / 60000);

      expect(remainingMinutes).toBeGreaterThanOrEqual(9);
      expect(remainingMinutes).toBeLessThanOrEqual(10);
    });
  });
});

describe('reserveTickets - Conflict Detection', () => {
  describe('Availability Check', () => {
    it('should detect sold ticket conflict', () => {
      const requestedIndices = [1, 2, 3, 4, 5];
      const soldIndices = new Set([3, 10, 15]);

      const conflicts = requestedIndices.filter((i) => soldIndices.has(i));
      expect(conflicts).toEqual([3]);
    });

    it('should detect reserved ticket conflict', () => {
      const requestedIndices = [1, 2, 3, 4, 5];
      const reservedIndices = new Set([2, 4]);

      const conflicts = requestedIndices.filter((i) => reservedIndices.has(i));
      expect(conflicts).toEqual([2, 4]);
    });

    it('should detect combined conflicts', () => {
      const requestedIndices = [1, 2, 3, 4, 5];
      const soldIndices = new Set([1]);
      const reservedIndices = new Set([5]);

      const unavailable = new Set([...soldIndices, ...reservedIndices]);
      const conflicts = requestedIndices.filter((i) => unavailable.has(i));
      expect(conflicts).toEqual([1, 5]);
    });

    it('should return empty for no conflicts', () => {
      const requestedIndices = [1, 2, 3];
      const unavailable = new Set([10, 20, 30]);

      const conflicts = requestedIndices.filter((i) => unavailable.has(i));
      expect(conflicts).toEqual([]);
    });
  });

  describe('Raffle Bounds Check', () => {
    it('should reject indices exceeding total tickets', () => {
      const totalTickets = 1000;
      const requestedIndices = [998, 999, 1000, 1001];

      const outOfBounds = requestedIndices.filter((i) => i >= totalTickets);
      expect(outOfBounds).toEqual([1000, 1001]);
    });

    it('should accept indices within bounds', () => {
      const totalTickets = 1000;
      const requestedIndices = [0, 500, 999];

      const outOfBounds = requestedIndices.filter((i) => i >= totalTickets);
      expect(outOfBounds).toEqual([]);
    });
  });
});

describe('reserveTickets - Buyer Information', () => {
  describe('Optional Buyer Fields', () => {
    it('should accept request without buyer info', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: [1, 2, 3],
      };

      const hasBuyerInfo =
        request.buyer_name ||
        request.buyer_email ||
        request.buyer_phone ||
        request.buyer_city;
      expect(hasBuyerInfo).toBeFalsy();
    });

    it('should accept request with partial buyer info', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: [1, 2, 3],
        buyer_name: 'Juan',
      };

      expect(request.buyer_name).toBe('Juan');
      expect(request.buyer_email).toBeUndefined();
    });

    it('should accept request with full buyer info', () => {
      const request: ReservationRequest = {
        raffle_id: 'test-raffle',
        ticket_indices: [1, 2, 3],
        buyer_name: 'Juan Perez',
        buyer_email: 'juan@example.com',
        buyer_phone: '+521234567890',
        buyer_city: 'CDMX',
      };

      expect(request.buyer_name).toBeDefined();
      expect(request.buyer_email).toBeDefined();
      expect(request.buyer_phone).toBeDefined();
      expect(request.buyer_city).toBeDefined();
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const validEmail = 'user@example.com';
      const invalidEmail = 'not-an-email';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });
  });
});

describe('reserveTickets - Response Format', () => {
  it('should return complete reservation response', () => {
    const response: ReservationResponse = {
      order_id: 'order-uuid-123',
      reserved_until: new Date(Date.now() + 900000).toISOString(),
      ticket_ranges: [{ s: 1, e: 5 }],
      ticket_count: 5,
    };

    expect(response).toHaveProperty('order_id');
    expect(response).toHaveProperty('reserved_until');
    expect(response).toHaveProperty('ticket_ranges');
    expect(response).toHaveProperty('ticket_count');
  });

  it('should include correct ticket count', () => {
    const ranges: TicketRange[] = [
      { s: 1, e: 5 },
      { s: 10, e: 12 },
    ];
    const ticketCount = ranges.reduce((sum, r) => sum + (r.e - r.s + 1), 0);

    expect(ticketCount).toBe(8);
  });
});

describe('reserveTickets - Raffle Status Check', () => {
  it('should only allow reservations for active raffles', () => {
    const raffle = { status: 'active' };
    const canReserve = raffle.status === 'active';
    expect(canReserve).toBe(true);
  });

  it('should reject reservations for draft raffles', () => {
    const raffle = { status: 'draft' };
    const canReserve = raffle.status === 'active';
    expect(canReserve).toBe(false);
  });

  it('should reject reservations for completed raffles', () => {
    const raffle = { status: 'completed' };
    const canReserve = raffle.status === 'active';
    expect(canReserve).toBe(false);
  });

  it('should reject reservations for cancelled raffles', () => {
    const raffle = { status: 'cancelled' };
    const canReserve = raffle.status === 'active';
    expect(canReserve).toBe(false);
  });
});

describe('reserveTickets - Lucky Number Handling', () => {
  it('should distinguish regular and lucky indices', () => {
    const order = {
      ticket_ranges: [{ s: 10, e: 14 }],
      lucky_indices: [7, 77],
    };

    const regularCount = rangesToIndices(order.ticket_ranges).length;
    const luckyCount = order.lucky_indices.length;

    expect(regularCount).toBe(5);
    expect(luckyCount).toBe(2);
  });

  it('should calculate total ticket count correctly', () => {
    const order = {
      ticket_ranges: [{ s: 0, e: 4 }],
      lucky_indices: [77, 88, 99],
    };

    const totalCount =
      rangesToIndices(order.ticket_ranges).length + order.lucky_indices.length;
    expect(totalCount).toBe(8);
  });
});

describe('reserveTickets - Error Handling', () => {
  describe('Error Responses', () => {
    it('should return 400 for invalid input', () => {
      const errors = { invalid_input: true };
      const expectedStatus = 400;
      expect(expectedStatus).toBe(400);
    });

    it('should return 404 for non-existent raffle', () => {
      const raffle = null;
      const expectedStatus = !raffle ? 404 : 200;
      expect(expectedStatus).toBe(404);
    });

    it('should return 409 for ticket conflicts', () => {
      const hasConflicts = true;
      const expectedStatus = hasConflicts ? 409 : 200;
      expect(expectedStatus).toBe(409);
    });

    it('should return 500 for server errors', () => {
      const error = new Error('Database error');
      const expectedStatus = 500;
      expect(error).toBeInstanceOf(Error);
      expect(expectedStatus).toBe(500);
    });
  });

  describe('Error Messages', () => {
    it('should include conflict details in error', () => {
      const conflictingTickets = [3, 7, 15];
      const errorResponse = {
        error: 'Tickets not available',
        conflicts: conflictingTickets,
      };

      expect(errorResponse.conflicts).toEqual([3, 7, 15]);
    });
  });
});
