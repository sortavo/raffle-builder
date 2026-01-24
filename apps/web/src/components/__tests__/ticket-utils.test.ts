import { describe, it, expect } from 'vitest';
import {
  parseTicketIndex,
  parseTicketIndices,
  validateTicketSelection,
  formatTicketSummary,
  isBulkPurchase,
  BULK_PURCHASE_THRESHOLD,
} from '@/lib/ticket-utils';

describe('ticket-utils', () => {
  describe('parseTicketIndex', () => {
    describe('basic parsing', () => {
      it('should parse simple numeric ticket numbers', () => {
        expect(parseTicketIndex('0001')).toBe(0);
        expect(parseTicketIndex('0010')).toBe(9);
        expect(parseTicketIndex('0100')).toBe(99);
      });

      it('should parse ticket number without leading zeros', () => {
        expect(parseTicketIndex('1')).toBe(0);
        expect(parseTicketIndex('42')).toBe(41);
      });

      it('should return -1 for empty string', () => {
        expect(parseTicketIndex('')).toBe(-1);
      });

      it('should return -1 for non-numeric string', () => {
        expect(parseTicketIndex('abc')).toBe(-1);
      });
    });

    describe('with numberStart parameter', () => {
      it('should calculate correct index when starting from 0', () => {
        expect(parseTicketIndex('0000', 0)).toBe(0);
        expect(parseTicketIndex('0010', 0)).toBe(10);
      });

      it('should calculate correct index when starting from 1 (default)', () => {
        expect(parseTicketIndex('0001', 1)).toBe(0);
        expect(parseTicketIndex('0100', 1)).toBe(99);
      });

      it('should calculate correct index when starting from 100', () => {
        expect(parseTicketIndex('100', 100)).toBe(0);
        expect(parseTicketIndex('150', 100)).toBe(50);
      });
    });

    describe('with step parameter', () => {
      it('should calculate correct index with step of 1 (default)', () => {
        expect(parseTicketIndex('0001', 1, 1)).toBe(0);
        expect(parseTicketIndex('0005', 1, 1)).toBe(4);
      });

      it('should calculate correct index with step of 2', () => {
        // Ticket numbers: 1, 3, 5, 7, 9... (step 2)
        expect(parseTicketIndex('0001', 1, 2)).toBe(0);
        expect(parseTicketIndex('0003', 1, 2)).toBe(1);
        expect(parseTicketIndex('0005', 1, 2)).toBe(2);
      });

      it('should calculate correct index with step of 5', () => {
        // Ticket numbers: 0, 5, 10, 15... (step 5, start 0)
        expect(parseTicketIndex('0000', 0, 5)).toBe(0);
        expect(parseTicketIndex('0005', 0, 5)).toBe(1);
        expect(parseTicketIndex('0010', 0, 5)).toBe(2);
      });

      it('should return -1 for invalid step alignment', () => {
        // If step is 2 and start is 1, valid numbers are 1, 3, 5...
        // Number 2 is not valid (would give index 0.5)
        expect(parseTicketIndex('0002', 1, 2)).toBe(-1);
      });
    });

    describe('prefixed ticket numbers', () => {
      it('should extract number from prefixed format', () => {
        expect(parseTicketIndex('TICKET-0042')).toBe(41);
        expect(parseTicketIndex('TKT-0001')).toBe(0);
        expect(parseTicketIndex('A-0100')).toBe(99);
      });

      it('should handle suffix formats', () => {
        expect(parseTicketIndex('0042-X')).toBe(41);
        expect(parseTicketIndex('0001-A')).toBe(0);
      });

      it('should handle complex formats with multiple numbers', () => {
        // Uses longest numeric match - both "0042" and "2024" have same length (4)
        // In this case, it picks the first match with longest length
        expect(parseTicketIndex('RIFA-0042-2024')).toBe(41); // Both same length, picks first (0042)
        expect(parseTicketIndex('RIFA-00042-24')).toBe(41); // Picks 00042 as longest (5 digits)
      });
    });

    describe('edge cases', () => {
      it('should return -1 for negative result index', () => {
        // If ticket number is less than numberStart
        expect(parseTicketIndex('0000', 1)).toBe(-1);
      });

      it('should handle very large numbers', () => {
        expect(parseTicketIndex('1000000', 1)).toBe(999999);
      });

      it('should handle undefined/null-like inputs', () => {
        expect(parseTicketIndex('' as string)).toBe(-1);
      });
    });
  });

  describe('parseTicketIndices', () => {
    it('should parse array of ticket numbers', () => {
      const numbers = ['0001', '0002', '0003'];
      expect(parseTicketIndices(numbers)).toEqual([0, 1, 2]);
    });

    it('should filter out invalid ticket numbers', () => {
      const numbers = ['0001', 'invalid', '0003'];
      expect(parseTicketIndices(numbers)).toEqual([0, 2]);
    });

    it('should handle empty array', () => {
      expect(parseTicketIndices([])).toEqual([]);
    });

    it('should respect numberStart parameter', () => {
      const numbers = ['100', '101', '102'];
      expect(parseTicketIndices(numbers, 100)).toEqual([0, 1, 2]);
    });

    it('should respect step parameter', () => {
      const numbers = ['0001', '0003', '0005'];
      expect(parseTicketIndices(numbers, 1, 2)).toEqual([0, 1, 2]);
    });

    it('should filter out numbers that do not align with step', () => {
      const numbers = ['0001', '0002', '0003']; // 0002 is invalid with step 2
      expect(parseTicketIndices(numbers, 1, 2)).toEqual([0, 1]); // Only 0001 and 0003
    });
  });

  describe('validateTicketSelection', () => {
    it('should return true for valid selection', () => {
      expect(validateTicketSelection(['0001', '0002'], [0, 1])).toBe(true);
    });

    it('should return false when arrays have different lengths', () => {
      expect(validateTicketSelection(['0001', '0002'], [0])).toBe(false);
      expect(validateTicketSelection(['0001'], [0, 1])).toBe(false);
    });

    it('should return false when indices contain negative values', () => {
      expect(validateTicketSelection(['0001', '0002'], [0, -1])).toBe(false);
    });

    it('should return true for empty arrays', () => {
      expect(validateTicketSelection([], [])).toBe(true);
    });

    it('should return true when all indices are non-negative', () => {
      expect(validateTicketSelection(['a', 'b', 'c'], [0, 1, 2])).toBe(true);
    });
  });

  describe('formatTicketSummary', () => {
    it('should return empty string for empty array', () => {
      expect(formatTicketSummary([])).toBe('');
    });

    it('should join small arrays with commas', () => {
      expect(formatTicketSummary(['001', '002', '003'])).toBe('001, 002, 003');
    });

    it('should truncate arrays larger than maxDisplay', () => {
      const tickets = Array.from({ length: 20 }, (_, i) =>
        String(i + 1).padStart(3, '0')
      );
      const result = formatTicketSummary(tickets, 10);
      expect(result).toContain('001');
      expect(result).toContain('010');
      expect(result).toContain('y 10 m\u00e1s');
      expect(result).not.toContain('011');
    });

    it('should respect custom maxDisplay parameter', () => {
      const tickets = ['001', '002', '003', '004', '005'];
      const result = formatTicketSummary(tickets, 3);
      expect(result).toBe('001, 002, 003 y 2 m\u00e1s');
    });

    it('should show exactly maxDisplay tickets when array length equals maxDisplay', () => {
      const tickets = ['001', '002', '003'];
      expect(formatTicketSummary(tickets, 3)).toBe('001, 002, 003');
    });

    it('should format remaining count with locale formatting', () => {
      const tickets = Array.from({ length: 1500 }, (_, i) =>
        String(i + 1).padStart(4, '0')
      );
      const result = formatTicketSummary(tickets, 10);
      // Should contain formatted number (1,490 or 1.490 depending on locale)
      expect(result).toMatch(/y 1[,.]?490 m\u00e1s/);
    });
  });

  describe('isBulkPurchase', () => {
    it('should return false for counts below threshold', () => {
      expect(isBulkPurchase(0)).toBe(false);
      expect(isBulkPurchase(100)).toBe(false);
      expect(isBulkPurchase(BULK_PURCHASE_THRESHOLD - 1)).toBe(false);
    });

    it('should return true for counts at or above threshold', () => {
      expect(isBulkPurchase(BULK_PURCHASE_THRESHOLD)).toBe(true);
      expect(isBulkPurchase(BULK_PURCHASE_THRESHOLD + 1)).toBe(true);
      expect(isBulkPurchase(1000)).toBe(true);
    });
  });

  describe('BULK_PURCHASE_THRESHOLD constant', () => {
    it('should be defined and be a positive number', () => {
      expect(BULK_PURCHASE_THRESHOLD).toBeDefined();
      expect(typeof BULK_PURCHASE_THRESHOLD).toBe('number');
      expect(BULK_PURCHASE_THRESHOLD).toBeGreaterThan(0);
    });

    it('should be 200 as per implementation', () => {
      expect(BULK_PURCHASE_THRESHOLD).toBe(200);
    });
  });
});
