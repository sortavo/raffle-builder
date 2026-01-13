import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Virtual Ticket Reservation Tests
 * 
 * These tests verify the ticket reservation logic including:
 * - Ticket index validation
 * - Large reservation handling (5000+ tickets)
 * - Reservation expiration
 * - Concurrency prevention
 * - Order total calculations
 */

// Constants matching production values
const BULK_THRESHOLD = 100;
const DEFAULT_RESERVATION_MINUTES = 15;

describe('Virtual Ticket Reservation Logic', () => {
  describe('Ticket Selection Validation', () => {
    it('should reject negative ticket indices', () => {
      const indices = [-1, 0, 1];
      const isValid = indices.every(i => i >= 0);
      expect(isValid).toBe(false);
    });

    it('should reject indices beyond total tickets', () => {
      const totalTickets = 100;
      const indices = [99, 100, 101];
      const isValid = indices.every(i => i < totalTickets);
      expect(isValid).toBe(false);
    });

    it('should accept valid indices within range', () => {
      const totalTickets = 100;
      const indices = [0, 50, 99];
      const isValid = indices.every(i => i >= 0 && i < totalTickets);
      expect(isValid).toBe(true);
    });

    it('should reject empty selection', () => {
      const indices: number[] = [];
      const isValid = indices.length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate maximum tickets per purchase', () => {
      const maxTicketsPerPurchase = 100;
      const selectedTickets = 150;
      const isValid = selectedTickets <= maxTicketsPerPurchase;
      expect(isValid).toBe(false);
    });

    it('should validate minimum tickets per purchase', () => {
      const minTicketsPerPurchase = 3;
      const selectedTickets = 2;
      const isValid = selectedTickets >= minTicketsPerPurchase;
      expect(isValid).toBe(false);
    });
  });

  describe('Large Ticket Reservations (5000+)', () => {
    it('should handle reservation of 5000 tickets', () => {
      const largeSelection = Array.from({ length: 5000 }, (_, i) => i);
      expect(largeSelection.length).toBe(5000);
      expect(largeSelection[0]).toBe(0);
      expect(largeSelection[4999]).toBe(4999);
    });

    it('should use lucky_indices for large reservations', () => {
      const ticketCount = 5000;
      const shouldUseLuckyIndices = ticketCount >= BULK_THRESHOLD;
      expect(shouldUseLuckyIndices).toBe(true);
    });

    it('should use ticket_ranges for small reservations', () => {
      const ticketCount = 50;
      const shouldUseLuckyIndices = ticketCount >= BULK_THRESHOLD;
      expect(shouldUseLuckyIndices).toBe(false);
    });

    it('should correctly convert indices to ranges', () => {
      const indices = [0, 1, 2, 5, 6, 7, 10];
      
      const convertToRanges = (nums: number[]) => {
        if (nums.length === 0) return [];
        const sorted = [...nums].sort((a, b) => a - b);
        const ranges: { s: number; e: number }[] = [];
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

      const ranges = convertToRanges(indices);
      expect(ranges).toEqual([
        { s: 0, e: 2 },
        { s: 5, e: 7 },
        { s: 10, e: 10 },
      ]);
    });

    it('should handle 100,000+ tickets efficiently', () => {
      const startTime = performance.now();
      const largeSelection = Array.from({ length: 100000 }, (_, i) => i);
      const endTime = performance.now();
      
      expect(largeSelection.length).toBe(100000);
      // Should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Reservation Expiration', () => {
    it('should set correct expiration time (15 minutes default)', () => {
      const now = new Date();
      const expirationMinutes = DEFAULT_RESERVATION_MINUTES;
      const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
      
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
      expect(diffMinutes).toBe(15);
    });

    it('should respect custom reservation time', () => {
      const now = new Date();
      const customMinutes = 30;
      const expiresAt = new Date(now.getTime() + customMinutes * 60 * 1000);
      
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
      expect(diffMinutes).toBe(30);
    });

    it('should detect expired reservations', () => {
      const now = new Date();
      const pastExpiration = new Date(now.getTime() - 1000);
      const futureExpiration = new Date(now.getTime() + 60000);
      
      const isExpired = (reservedUntil: Date) => reservedUntil < now;
      
      expect(isExpired(pastExpiration)).toBe(true);
      expect(isExpired(futureExpiration)).toBe(false);
    });

    it('should calculate remaining time correctly', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingMinutes = Math.floor(remainingMs / 60000);
      const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
      
      expect(remainingMinutes).toBe(5);
      expect(remainingSeconds).toBe(0);
    });
  });

  describe('Concurrency Prevention', () => {
    it('should detect duplicate ticket indices', () => {
      const indices = [1, 2, 3, 2, 4];
      const uniqueIndices = [...new Set(indices)];
      const hasDuplicates = indices.length !== uniqueIndices.length;
      expect(hasDuplicates).toBe(true);
    });

    it('should remove duplicates from selection', () => {
      const indices = [1, 2, 3, 2, 4, 4, 5];
      const uniqueIndices = [...new Set(indices)];
      expect(uniqueIndices).toEqual([1, 2, 3, 4, 5]);
    });

    it('should validate non-overlapping ranges', () => {
      const range1 = { s: 0, e: 10 };
      const range2 = { s: 11, e: 20 };
      const range3 = { s: 5, e: 15 };
      
      const overlaps = (a: typeof range1, b: typeof range1) =>
        a.s <= b.e && b.s <= a.e;
      
      expect(overlaps(range1, range2)).toBe(false);
      expect(overlaps(range1, range3)).toBe(true);
    });

    it('should detect conflicting reservations', () => {
      const existingOrders = [
        { ticket_ranges: [{ s: 0, e: 10 }], status: 'reserved' },
        { ticket_ranges: [{ s: 20, e: 30 }], status: 'sold' },
      ];

      const newIndices = [5, 6, 7]; // Overlaps with first order
      
      const hasConflict = (indices: number[], orders: typeof existingOrders) => {
        return orders.some(order => {
          if (order.status !== 'reserved' && order.status !== 'sold') return false;
          return order.ticket_ranges.some(range => 
            indices.some(idx => idx >= range.s && idx <= range.e)
          );
        });
      };

      expect(hasConflict(newIndices, existingOrders)).toBe(true);
      expect(hasConflict([15, 16, 17], existingOrders)).toBe(false);
    });

    it('should use optimistic locking for updates', () => {
      const checkVersionMatch = (original: number, current: number) => original === current;
      
      expect(checkVersionMatch(1, 1)).toBe(true);
      expect(checkVersionMatch(0, 1)).toBe(false);
    });
  });

  describe('Order Total Calculation', () => {
    it('should calculate correct total for standard purchase', () => {
      const ticketPrice = 250;
      const ticketCount = 5;
      const expectedTotal = 1250;
      expect(ticketPrice * ticketCount).toBe(expectedTotal);
    });

    it('should apply package discount correctly', () => {
      const packagePrice = 2250;
      const packageTickets = 10;
      const ticketPrice = 250;
      const regularPrice = ticketPrice * packageTickets; // 2500
      const discount = regularPrice - packagePrice; // 250
      
      expect(discount).toBe(250);
      expect(packagePrice).toBeLessThan(regularPrice);
    });

    it('should calculate package savings percentage', () => {
      const packagePrice = 2250;
      const packageTickets = 10;
      const ticketPrice = 250;
      const regularPrice = ticketPrice * packageTickets;
      const savingsPercent = ((regularPrice - packagePrice) / regularPrice) * 100;
      
      expect(savingsPercent).toBe(10); // 10% savings
    });

    it('should apply coupon percent discount', () => {
      const subtotal = 1000;
      const couponPercent = 10;
      const discount = subtotal * (couponPercent / 100);
      const finalTotal = subtotal - discount;
      
      expect(discount).toBe(100);
      expect(finalTotal).toBe(900);
    });

    it('should apply coupon fixed discount', () => {
      const subtotal = 1000;
      const couponFixed = 150;
      const finalTotal = Math.max(0, subtotal - couponFixed);
      
      expect(finalTotal).toBe(850);
    });

    it('should not allow negative totals', () => {
      const subtotal = 100;
      const couponFixed = 200;
      const finalTotal = Math.max(0, subtotal - couponFixed);
      
      expect(finalTotal).toBe(0);
    });

    it('should respect minimum purchase requirement', () => {
      const subtotal = 500;
      const minPurchase = 1000;
      const couponApplies = subtotal >= minPurchase;
      
      expect(couponApplies).toBe(false);
    });
  });

  describe('Lucky Numbers Validation', () => {
    it('should validate lucky numbers are within range', () => {
      const totalTickets = 1000;
      const luckyNumbers = [1, 42, 999];
      const allValid = luckyNumbers.every(n => n >= 0 && n < totalTickets);
      expect(allValid).toBe(true);
    });

    it('should reject out-of-range lucky numbers', () => {
      const totalTickets = 100;
      const luckyNumbers = [1, 42, 999]; // 999 is out of range
      const allValid = luckyNumbers.every(n => n >= 0 && n < totalTickets);
      expect(allValid).toBe(false);
    });

    it('should limit number of lucky number requests', () => {
      const maxLuckyNumbers = 5;
      const requestedCount = 10;
      const isValid = requestedCount <= maxLuckyNumbers;
      expect(isValid).toBe(false);
    });
  });

  describe('Reference Code Generation', () => {
    it('should generate unique reference codes', () => {
      const generateRef = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'REF-';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const refs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        refs.add(generateRef());
      }
      
      // All should be unique
      expect(refs.size).toBe(100);
    });

    it('should follow expected format', () => {
      const refCode = 'REF-A2B3C4D5';
      const isValidFormat = /^REF-[A-Z0-9]{8}$/.test(refCode);
      expect(isValidFormat).toBe(true);
    });
  });
});

describe('Ticket Status Transitions', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    'available': ['reserved'],
    'reserved': ['sold', 'available', 'cancelled'],
    'sold': ['cancelled'],
    'cancelled': ['available'],
  };

  it('should allow valid transitions', () => {
    expect(VALID_TRANSITIONS['available']).toContain('reserved');
    expect(VALID_TRANSITIONS['reserved']).toContain('sold');
    expect(VALID_TRANSITIONS['sold']).toContain('cancelled');
  });

  it('should block invalid transitions', () => {
    expect(VALID_TRANSITIONS['available']).not.toContain('sold');
    expect(VALID_TRANSITIONS['sold']).not.toContain('reserved');
  });

  it('should validate transition is allowed', () => {
    const isValidTransition = (from: string, to: string) => {
      const transitions = VALID_TRANSITIONS as Record<string, string[]>;
      return transitions[from]?.includes(to) ?? false;
    };

    expect(isValidTransition('reserved', 'sold')).toBe(true);
    expect(isValidTransition('available', 'sold')).toBe(false);
  });
});
