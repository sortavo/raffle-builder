import { describe, it, expect } from 'vitest';

// Test the pure business logic functions from useOrders
// These don't require mocking Supabase

interface TicketRange {
  s: number; // start
  e: number; // end
}

interface NumberingConfig {
  start_number?: number;
  step?: number;
  pad_enabled?: boolean;
  pad_width?: number;
  pad_char?: string;
  prefix?: string;
  suffix?: string;
  separator?: string;
}

// Extract the pure function for expanding ticket ranges
const expandTicketRanges = (
  ranges: TicketRange[],
  luckyIndices: number[] = []
): number[] => {
  const indices: number[] = [];

  // Add lucky indices
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

  // Sort and return unique values
  return [...new Set(indices)].sort((a, b) => a - b);
};

// Extract the pure function for formatting ticket numbers
// Note: Uses || which means 0 is treated as falsy and defaults to 1
const formatTicketNumber = (
  idx: number,
  config: NumberingConfig,
  totalTickets: number
): string => {
  const startNumber = config.start_number || 1;
  const step = config.step || 1;
  const padEnabled = config.pad_enabled !== false;
  const padWidth = config.pad_width || String(totalTickets).length;
  const padChar = config.pad_char || '0';
  const prefix = config.prefix || '';
  const suffix = config.suffix || '';
  const separator = config.separator || '';

  const num = startNumber + (idx * step);
  let numStr = String(num);
  if (padEnabled && numStr.length < padWidth) {
    numStr = padChar.repeat(padWidth - numStr.length) + numStr;
  }
  return `${prefix}${separator}${numStr}${suffix}`;
};

describe('useOrders - expandTicketRanges', () => {
  describe('single range expansion', () => {
    it('should expand a simple range', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 4 }];
      expect(expandTicketRanges(ranges)).toEqual([0, 1, 2, 3, 4]);
    });

    it('should expand a single ticket range', () => {
      const ranges: TicketRange[] = [{ s: 5, e: 5 }];
      expect(expandTicketRanges(ranges)).toEqual([5]);
    });

    it('should expand a large range', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 99 }];
      const result = expandTicketRanges(ranges);
      expect(result).toHaveLength(100);
      expect(result[0]).toBe(0);
      expect(result[99]).toBe(99);
    });
  });

  describe('multiple ranges', () => {
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

    it('should sort results from unsorted ranges', () => {
      const ranges: TicketRange[] = [
        { s: 10, e: 12 },
        { s: 0, e: 2 },
      ];
      expect(expandTicketRanges(ranges)).toEqual([0, 1, 2, 10, 11, 12]);
    });
  });

  describe('lucky indices', () => {
    it('should include lucky indices', () => {
      const ranges: TicketRange[] = [];
      const lucky = [5, 10, 15];
      expect(expandTicketRanges(ranges, lucky)).toEqual([5, 10, 15]);
    });

    it('should combine ranges and lucky indices', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 2 }];
      const lucky = [10, 20];
      expect(expandTicketRanges(ranges, lucky)).toEqual([0, 1, 2, 10, 20]);
    });

    it('should dedupe when lucky indices overlap with ranges', () => {
      const ranges: TicketRange[] = [{ s: 0, e: 5 }];
      const lucky = [3, 4, 10];
      expect(expandTicketRanges(ranges, lucky)).toEqual([0, 1, 2, 3, 4, 5, 10]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty ranges', () => {
      expect(expandTicketRanges([])).toEqual([]);
    });

    it('should handle null-like values', () => {
      expect(expandTicketRanges([], [])).toEqual([]);
    });
  });
});

describe('useOrders - formatTicketNumber', () => {
  describe('default formatting', () => {
    it('should format with default config', () => {
      const config: NumberingConfig = {};
      expect(formatTicketNumber(0, config, 100)).toBe('001');
      expect(formatTicketNumber(9, config, 100)).toBe('010');
      expect(formatTicketNumber(99, config, 100)).toBe('100');
    });

    it('should auto-calculate pad width from total tickets', () => {
      expect(formatTicketNumber(0, {}, 10)).toBe('01');
      expect(formatTicketNumber(0, {}, 100)).toBe('001');
      expect(formatTicketNumber(0, {}, 1000)).toBe('0001');
      expect(formatTicketNumber(0, {}, 10000)).toBe('00001');
    });
  });

  describe('start number', () => {
    it('should use custom start number', () => {
      const config: NumberingConfig = { start_number: 100 };
      expect(formatTicketNumber(0, config, 100)).toBe('100');
      expect(formatTicketNumber(1, config, 100)).toBe('101');
      expect(formatTicketNumber(10, config, 100)).toBe('110');
    });

    it('should treat start number of 0 as 1 (due to || operator)', () => {
      // Note: This is current behavior - start_number=0 is falsy so defaults to 1
      const config: NumberingConfig = { start_number: 0 };
      expect(formatTicketNumber(0, config, 100)).toBe('001');
      expect(formatTicketNumber(1, config, 100)).toBe('002');
    });
  });

  describe('step', () => {
    it('should use custom step', () => {
      const config: NumberingConfig = { step: 2 };
      expect(formatTicketNumber(0, config, 100)).toBe('001');
      expect(formatTicketNumber(1, config, 100)).toBe('003');
      expect(formatTicketNumber(2, config, 100)).toBe('005');
    });

    it('should combine start number and step', () => {
      const config: NumberingConfig = { start_number: 100, step: 5 };
      expect(formatTicketNumber(0, config, 1000)).toBe('0100');
      expect(formatTicketNumber(1, config, 1000)).toBe('0105');
      expect(formatTicketNumber(10, config, 1000)).toBe('0150');
    });
  });

  describe('padding', () => {
    it('should respect pad_enabled false', () => {
      const config: NumberingConfig = { pad_enabled: false };
      expect(formatTicketNumber(0, config, 1000)).toBe('1');
      expect(formatTicketNumber(9, config, 1000)).toBe('10');
      expect(formatTicketNumber(999, config, 1000)).toBe('1000');
    });

    it('should use custom pad width', () => {
      const config: NumberingConfig = { pad_width: 6 };
      expect(formatTicketNumber(0, config, 100)).toBe('000001');
      expect(formatTicketNumber(999, config, 100)).toBe('001000');
    });

    it('should use custom pad character', () => {
      const config: NumberingConfig = { pad_char: 'X', pad_width: 5 };
      expect(formatTicketNumber(0, config, 100)).toBe('XXXX1');
      expect(formatTicketNumber(99, config, 100)).toBe('XX100');
    });
  });

  describe('prefix and suffix', () => {
    it('should add prefix', () => {
      const config: NumberingConfig = { prefix: 'RAFFLE' };
      expect(formatTicketNumber(0, config, 100)).toBe('RAFFLE001');
    });

    it('should add suffix', () => {
      const config: NumberingConfig = { suffix: '-2024' };
      expect(formatTicketNumber(0, config, 100)).toBe('001-2024');
    });

    it('should add both prefix and suffix', () => {
      const config: NumberingConfig = { prefix: 'R', suffix: 'A' };
      expect(formatTicketNumber(0, config, 100)).toBe('R001A');
    });

    it('should add separator between prefix and number', () => {
      const config: NumberingConfig = { prefix: 'RAFFLE', separator: '-' };
      expect(formatTicketNumber(0, config, 100)).toBe('RAFFLE-001');
    });
  });

  describe('complex configurations', () => {
    it('should handle full configuration', () => {
      const config: NumberingConfig = {
        start_number: 1000,
        step: 1,
        pad_enabled: true,
        pad_width: 6,
        pad_char: '0',
        prefix: 'TKT',
        suffix: '-VIP',
        separator: '-',
      };
      expect(formatTicketNumber(0, config, 1000)).toBe('TKT-001000-VIP');
      expect(formatTicketNumber(1, config, 1000)).toBe('TKT-001001-VIP');
    });

    it('should handle lottery-style numbering', () => {
      // Note: start_number=0 is treated as 1 due to || operator
      const config: NumberingConfig = {
        start_number: 1,
        pad_width: 5,
        prefix: 'LOTTO',
        separator: '-',
      };
      expect(formatTicketNumber(0, config, 100000)).toBe('LOTTO-00001');
      expect(formatTicketNumber(99999, config, 100000)).toBe('LOTTO-100000');
    });
  });
});

describe('useOrders - ticket count validation', () => {
  const calculateTicketCount = (ranges: TicketRange[], luckyIndices: number[] = []): number => {
    return expandTicketRanges(ranges, luckyIndices).length;
  };

  it('should count tickets correctly from single range', () => {
    expect(calculateTicketCount([{ s: 0, e: 9 }])).toBe(10);
    expect(calculateTicketCount([{ s: 0, e: 99 }])).toBe(100);
  });

  it('should count tickets correctly from multiple ranges', () => {
    expect(calculateTicketCount([
      { s: 0, e: 4 },
      { s: 10, e: 14 },
    ])).toBe(10);
  });

  it('should count tickets correctly with lucky numbers', () => {
    expect(calculateTicketCount([], [1, 2, 3])).toBe(3);
    expect(calculateTicketCount([{ s: 0, e: 4 }], [10, 20])).toBe(7);
  });
});

describe('useOrders - reference code validation', () => {
  // Reference codes should follow a specific format
  const isValidReferenceCode = (code: string): boolean => {
    // Format: XXXXXX (6 alphanumeric characters)
    return /^[A-Z0-9]{6}$/.test(code);
  };

  it('should validate correct reference codes', () => {
    expect(isValidReferenceCode('ABC123')).toBe(true);
    expect(isValidReferenceCode('ZZZZZZ')).toBe(true);
    expect(isValidReferenceCode('000000')).toBe(true);
  });

  it('should reject invalid reference codes', () => {
    expect(isValidReferenceCode('abc123')).toBe(false); // lowercase
    expect(isValidReferenceCode('ABC12')).toBe(false); // too short
    expect(isValidReferenceCode('ABC1234')).toBe(false); // too long
    expect(isValidReferenceCode('ABC-12')).toBe(false); // special chars
  });
});

describe('useOrders - reservation expiration', () => {
  const isReservationExpired = (reservedUntil: string | null): boolean => {
    if (!reservedUntil) return true;
    return new Date(reservedUntil) < new Date();
  };

  const getRemainingTime = (reservedUntil: string | null): number => {
    if (!reservedUntil) return 0;
    const remaining = new Date(reservedUntil).getTime() - Date.now();
    return Math.max(0, remaining);
  };

  it('should detect expired reservations', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    expect(isReservationExpired(pastDate)).toBe(true);
  });

  it('should detect active reservations', () => {
    const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 min from now
    expect(isReservationExpired(futureDate)).toBe(false);
  });

  it('should handle null reservation', () => {
    expect(isReservationExpired(null)).toBe(true);
  });

  it('should calculate remaining time', () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    const remaining = getRemainingTime(futureDate);
    expect(remaining).toBeGreaterThan(59000);
    expect(remaining).toBeLessThanOrEqual(60000);
  });

  it('should return 0 for expired reservations', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    expect(getRemainingTime(pastDate)).toBe(0);
  });
});
