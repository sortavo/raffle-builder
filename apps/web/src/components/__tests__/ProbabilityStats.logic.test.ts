import { describe, it, expect } from 'vitest';

/**
 * Unit tests for ProbabilityStats business logic
 * Testing probability calculations and formatting functions
 */

// Recreate the probability format structure
interface ProbabilityFormat {
  kind: 'percent' | 'oneIn';
  percent?: string;
  oneIn?: number;
}

// Recreate getProbabilityFormat function from component
function getProbabilityFormat(probability: number): ProbabilityFormat {
  if (probability >= 10) {
    return { kind: 'percent', percent: probability.toFixed(0) + '%' };
  } else if (probability >= 1) {
    return { kind: 'percent', percent: probability.toFixed(1) + '%' };
  } else if (probability >= 0.1) {
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  } else if (probability >= 0.01) {
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  } else if (probability > 0) {
    // For very small percentages, use "1 en X" format
    const oneInX = Math.round(100 / probability);
    if (oneInX >= 1000) {
      return { kind: 'oneIn', oneIn: oneInX };
    }
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  }
  return { kind: 'percent', percent: '0%' };
}

// Legacy string format
function formatProbability(probability: number): string {
  const format = getProbabilityFormat(probability);
  if (format.kind === 'percent') {
    return format.percent!;
  }
  return `1 en ${format.oneIn!.toLocaleString()}`;
}

// Calculate statistics like the component does
interface ProbabilityStats {
  probabilityPerTicket: number;
  probabilityWithSelection: number;
  soldPercentage: number;
  timesMoreLikely: number;
}

function calculateStats(
  totalTickets: number,
  ticketsSold: number,
  ticketsAvailable: number,
  selectedCount: number
): ProbabilityStats {
  const probabilityPerTicket = ticketsAvailable > 0 ? (1 / ticketsAvailable) * 100 : 0;
  const probabilityWithSelection = ticketsAvailable > 0 ? (selectedCount / ticketsAvailable) * 100 : 0;
  const soldPercentage = (ticketsSold / totalTickets) * 100;

  // Compare to national lottery (approximately 1 in 10 million)
  const nationalLotteryOdds = 1 / 10000000;
  const raffleOdds = ticketsAvailable > 0 ? 1 / ticketsAvailable : 0;
  const timesMoreLikely = raffleOdds > 0 ? Math.round(raffleOdds / nationalLotteryOdds) : 0;

  return {
    probabilityPerTicket,
    probabilityWithSelection,
    soldPercentage,
    timesMoreLikely,
  };
}

describe('ProbabilityStats Logic', () => {
  describe('getProbabilityFormat', () => {
    describe('high probability (>= 10%)', () => {
      it('should format as integer percentage', () => {
        expect(getProbabilityFormat(50)).toEqual({ kind: 'percent', percent: '50%' });
        expect(getProbabilityFormat(10)).toEqual({ kind: 'percent', percent: '10%' });
        expect(getProbabilityFormat(99.9)).toEqual({ kind: 'percent', percent: '100%' });
      });
    });

    describe('medium probability (1% - 10%)', () => {
      it('should format with 1 decimal place', () => {
        expect(getProbabilityFormat(5.5)).toEqual({ kind: 'percent', percent: '5.5%' });
        expect(getProbabilityFormat(1)).toEqual({ kind: 'percent', percent: '1.0%' });
        expect(getProbabilityFormat(9.99)).toEqual({ kind: 'percent', percent: '10.0%' });
      });
    });

    describe('low probability (0.01% - 1%)', () => {
      it('should format with 2 decimal places', () => {
        expect(getProbabilityFormat(0.5)).toEqual({ kind: 'percent', percent: '0.50%' });
        expect(getProbabilityFormat(0.1)).toEqual({ kind: 'percent', percent: '0.10%' });
        expect(getProbabilityFormat(0.01)).toEqual({ kind: 'percent', percent: '0.01%' });
      });
    });

    describe('very low probability (< 0.01%)', () => {
      it('should use "1 en X" format for very small probabilities', () => {
        // 0.001% = 1 in 100,000
        const result = getProbabilityFormat(0.001);
        expect(result.kind).toBe('oneIn');
        expect(result.oneIn).toBe(100000);
      });

      it('should use "1 en X" format only when X >= 1000', () => {
        // 0.1% = 1 in 1000
        const result = getProbabilityFormat(0.1);
        expect(result.kind).toBe('percent');

        // 0.09% would be ~1 in 1111, so should use oneIn
        const result2 = getProbabilityFormat(0.005);
        expect(result2.kind).toBe('oneIn');
      });
    });

    describe('zero probability', () => {
      it('should return 0% for zero', () => {
        expect(getProbabilityFormat(0)).toEqual({ kind: 'percent', percent: '0%' });
      });
    });
  });

  describe('formatProbability (legacy string format)', () => {
    it('should format percent format correctly', () => {
      expect(formatProbability(50)).toBe('50%');
      expect(formatProbability(5.5)).toBe('5.5%');
      expect(formatProbability(0.5)).toBe('0.50%');
    });

    it('should format oneIn format correctly', () => {
      const result = formatProbability(0.001);
      expect(result).toContain('1 en');
      expect(result).toContain('100');
    });
  });

  describe('calculateStats', () => {
    describe('probabilityPerTicket', () => {
      it('should calculate correct probability for available tickets', () => {
        const stats = calculateStats(1000, 0, 1000, 0);
        expect(stats.probabilityPerTicket).toBeCloseTo(0.1, 5); // 1/1000 = 0.1%
      });

      it('should return 0 when no tickets available', () => {
        const stats = calculateStats(1000, 1000, 0, 0);
        expect(stats.probabilityPerTicket).toBe(0);
      });

      it('should increase as more tickets are sold', () => {
        const stats500 = calculateStats(1000, 500, 500, 0);
        const stats900 = calculateStats(1000, 900, 100, 0);

        expect(stats900.probabilityPerTicket).toBeGreaterThan(stats500.probabilityPerTicket);
      });
    });

    describe('probabilityWithSelection', () => {
      it('should calculate probability for selected tickets', () => {
        const stats = calculateStats(1000, 0, 1000, 10);
        expect(stats.probabilityWithSelection).toBeCloseTo(1, 5); // 10/1000 = 1%
      });

      it('should be 0 when no tickets selected', () => {
        const stats = calculateStats(1000, 0, 1000, 0);
        expect(stats.probabilityWithSelection).toBe(0);
      });

      it('should increase with more tickets selected', () => {
        const stats5 = calculateStats(1000, 0, 1000, 5);
        const stats10 = calculateStats(1000, 0, 1000, 10);

        expect(stats10.probabilityWithSelection).toBe(stats5.probabilityWithSelection * 2);
      });
    });

    describe('soldPercentage', () => {
      it('should calculate correct sold percentage', () => {
        const stats = calculateStats(1000, 500, 500, 0);
        expect(stats.soldPercentage).toBe(50);
      });

      it('should be 0 when no tickets sold', () => {
        const stats = calculateStats(1000, 0, 1000, 0);
        expect(stats.soldPercentage).toBe(0);
      });

      it('should be 100 when all tickets sold', () => {
        const stats = calculateStats(1000, 1000, 0, 0);
        expect(stats.soldPercentage).toBe(100);
      });
    });

    describe('timesMoreLikely (compared to national lottery)', () => {
      it('should calculate how many times more likely than lottery', () => {
        // National lottery: 1 in 10,000,000
        // Raffle with 1000 tickets: 1 in 1000
        // Times more likely: 10,000,000 / 1000 = 10,000
        const stats = calculateStats(1000, 0, 1000, 0);
        expect(stats.timesMoreLikely).toBe(10000);
      });

      it('should return 0 when no tickets available', () => {
        const stats = calculateStats(1000, 1000, 0, 0);
        expect(stats.timesMoreLikely).toBe(0);
      });

      it('should be higher for smaller raffles', () => {
        const smallRaffle = calculateStats(100, 0, 100, 0);
        const largeRaffle = calculateStats(10000, 0, 10000, 0);

        expect(smallRaffle.timesMoreLikely).toBeGreaterThan(largeRaffle.timesMoreLikely);
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle small raffle (100 tickets)', () => {
      const stats = calculateStats(100, 30, 70, 5);

      expect(stats.probabilityPerTicket).toBeCloseTo(1.428, 2); // ~1.43%
      expect(stats.probabilityWithSelection).toBeCloseTo(7.14, 1); // ~7.14%
      expect(stats.soldPercentage).toBe(30);
    });

    it('should handle medium raffle (5000 tickets)', () => {
      const stats = calculateStats(5000, 2000, 3000, 10);

      expect(stats.probabilityPerTicket).toBeCloseTo(0.033, 3); // ~0.033%
      expect(stats.probabilityWithSelection).toBeCloseTo(0.33, 2); // ~0.33%
      expect(stats.soldPercentage).toBe(40);
    });

    it('should handle large raffle (100000 tickets)', () => {
      const stats = calculateStats(100000, 50000, 50000, 100);

      expect(stats.probabilityPerTicket).toBeCloseTo(0.002, 3); // 0.002%
      expect(stats.probabilityWithSelection).toBeCloseTo(0.2, 2); // 0.2%
      expect(stats.soldPercentage).toBe(50);
    });

    it('should handle mega raffle (1000000 tickets)', () => {
      const stats = calculateStats(1000000, 0, 1000000, 1000);

      expect(stats.probabilityPerTicket).toBeCloseTo(0.0001, 4); // 0.0001%
      expect(stats.probabilityWithSelection).toBeCloseTo(0.1, 1); // 0.1%

      // Format should use "1 en X" for very small probabilities
      const format = getProbabilityFormat(stats.probabilityPerTicket);
      expect(format.kind).toBe('oneIn');
    });
  });

  describe('package multiplier calculations', () => {
    // Test the package multiplier display calculations
    const packageMultipliers = [
      { qty: 3, label: '3 boletos' },
      { qty: 5, label: '5 boletos' },
      { qty: 10, label: '10 boletos' },
    ];

    it('should calculate probabilities for each package size', () => {
      const ticketsAvailable = 1000;
      const ticketPrice = 100;

      packageMultipliers.forEach(pkg => {
        const probability = (pkg.qty / ticketsAvailable) * 100;
        const cost = pkg.qty * ticketPrice;

        expect(probability).toBe(pkg.qty / 10); // 0.3%, 0.5%, 1%
        expect(cost).toBe(pkg.qty * ticketPrice);
      });
    });
  });
});
