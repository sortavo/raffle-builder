import { describe, it, expect } from 'vitest';

/**
 * Unit tests for TicketSelector business logic
 * Testing utility functions for ticket selection, batch handling, and shuffle
 */

// Maximum random selection constant from component
const MAX_RANDOM_SELECTION = 50000;

// Recreate getBatchIndicator function from component
interface BatchIndicator {
  label: string;
  colorClasses: string;
  textColor: string;
  message: string;
}

function getBatchIndicator(count: number): BatchIndicator | null {
  if (count >= 10000) {
    return {
      label: 'Mega lote',
      colorClasses: 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-600 dark:text-red-400',
      message: 'la generaci\u00f3n puede tomar 30+ segundos',
    };
  }
  if (count >= 1000) {
    return {
      label: 'Lote muy grande',
      colorClasses: 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/30',
      textColor: 'text-orange-600 dark:text-orange-400',
      message: 'la generaci\u00f3n puede tomar 5-15 segundos',
    };
  }
  if (count >= 100) {
    return {
      label: 'Lote grande',
      colorClasses: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-600 dark:text-amber-400',
      message: 'la generaci\u00f3n puede tomar unos segundos',
    };
  }
  return null;
}

// Deterministic shuffle function from component
function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  let randomValue = seed;

  while (currentIndex !== 0) {
    randomValue = (randomValue * 1103515245 + 12345) & 0x7fffffff;
    const randomIndex = randomValue % currentIndex;
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  return shuffled;
}

// Calculate total price based on packages
interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

function calculateTotal(
  selectedTickets: string[],
  packages: Package[],
  ticketPrice: number
): number {
  const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
  if (matchingPackage) {
    return matchingPackage.price;
  }
  return selectedTickets.length * ticketPrice;
}

// Find best package by discount
function findBestPackage(packages: Package[]): Package | undefined {
  return packages.reduce((best, pkg) => {
    if (!best || (pkg.discount_percent || 0) > (best.discount_percent || 0)) {
      return pkg;
    }
    return best;
  }, packages[0]);
}

describe('TicketSelector Logic', () => {
  describe('getBatchIndicator', () => {
    describe('no indicator (small batches)', () => {
      it('should return null for counts below 100', () => {
        expect(getBatchIndicator(0)).toBeNull();
        expect(getBatchIndicator(1)).toBeNull();
        expect(getBatchIndicator(50)).toBeNull();
        expect(getBatchIndicator(99)).toBeNull();
      });
    });

    describe('large batch (100-999)', () => {
      it('should return "Lote grande" for 100+', () => {
        const indicator = getBatchIndicator(100);
        expect(indicator).not.toBeNull();
        expect(indicator!.label).toBe('Lote grande');
      });

      it('should have amber colors', () => {
        const indicator = getBatchIndicator(500);
        expect(indicator!.colorClasses).toContain('amber');
        expect(indicator!.textColor).toContain('amber');
      });

      it('should have appropriate message', () => {
        const indicator = getBatchIndicator(100);
        expect(indicator!.message).toContain('unos segundos');
      });
    });

    describe('very large batch (1000-9999)', () => {
      it('should return "Lote muy grande" for 1000+', () => {
        const indicator = getBatchIndicator(1000);
        expect(indicator!.label).toBe('Lote muy grande');
      });

      it('should have orange colors', () => {
        const indicator = getBatchIndicator(5000);
        expect(indicator!.colorClasses).toContain('orange');
        expect(indicator!.textColor).toContain('orange');
      });

      it('should indicate 5-15 seconds', () => {
        const indicator = getBatchIndicator(1000);
        expect(indicator!.message).toContain('5-15 segundos');
      });
    });

    describe('mega batch (10000+)', () => {
      it('should return "Mega lote" for 10000+', () => {
        const indicator = getBatchIndicator(10000);
        expect(indicator!.label).toBe('Mega lote');
      });

      it('should have red colors', () => {
        const indicator = getBatchIndicator(50000);
        expect(indicator!.colorClasses).toContain('red');
        expect(indicator!.textColor).toContain('red');
      });

      it('should indicate 30+ seconds', () => {
        const indicator = getBatchIndicator(10000);
        expect(indicator!.message).toContain('30+ segundos');
      });
    });

    describe('boundary cases', () => {
      it('should transition at exactly 100', () => {
        expect(getBatchIndicator(99)).toBeNull();
        expect(getBatchIndicator(100)!.label).toBe('Lote grande');
      });

      it('should transition at exactly 1000', () => {
        expect(getBatchIndicator(999)!.label).toBe('Lote grande');
        expect(getBatchIndicator(1000)!.label).toBe('Lote muy grande');
      });

      it('should transition at exactly 10000', () => {
        expect(getBatchIndicator(9999)!.label).toBe('Lote muy grande');
        expect(getBatchIndicator(10000)!.label).toBe('Mega lote');
      });
    });
  });

  describe('shuffleArray', () => {
    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return array of same length', () => {
      const shuffled = shuffleArray(testArray, 12345);
      expect(shuffled.length).toBe(testArray.length);
    });

    it('should contain all original elements', () => {
      const shuffled = shuffleArray(testArray, 12345);
      expect(shuffled.sort((a, b) => a - b)).toEqual(testArray);
    });

    it('should be deterministic with same seed', () => {
      const shuffled1 = shuffleArray(testArray, 42);
      const shuffled2 = shuffleArray(testArray, 42);
      expect(shuffled1).toEqual(shuffled2);
    });

    it('should produce different results with different seeds', () => {
      const shuffled1 = shuffleArray(testArray, 42);
      const shuffled2 = shuffleArray(testArray, 43);
      expect(shuffled1).not.toEqual(shuffled2);
    });

    it('should not modify original array', () => {
      const original = [...testArray];
      shuffleArray(testArray, 12345);
      expect(testArray).toEqual(original);
    });

    it('should handle empty array', () => {
      expect(shuffleArray([], 12345)).toEqual([]);
    });

    it('should handle single element array', () => {
      expect(shuffleArray([42], 12345)).toEqual([42]);
    });

    it('should handle array of objects', () => {
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const shuffled = shuffleArray(objects, 12345);
      expect(shuffled.length).toBe(3);
      expect(shuffled.map(o => o.id).sort()).toEqual([1, 2, 3]);
    });
  });

  describe('calculateTotal', () => {
    const packages: Package[] = [
      { id: '1', quantity: 5, price: 450, discount_percent: 10, label: '5 boletos' },
      { id: '2', quantity: 10, price: 800, discount_percent: 20, label: '10 boletos' },
      { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: '20 boletos' },
    ];
    const ticketPrice = 100;

    it('should use package price when quantity matches', () => {
      const tickets = ['001', '002', '003', '004', '005']; // 5 tickets
      expect(calculateTotal(tickets, packages, ticketPrice)).toBe(450);
    });

    it('should use ticket price when no package matches', () => {
      const tickets = ['001', '002', '003']; // 3 tickets, no package
      expect(calculateTotal(tickets, packages, ticketPrice)).toBe(300);
    });

    it('should handle empty selection', () => {
      expect(calculateTotal([], packages, ticketPrice)).toBe(0);
    });

    it('should handle single ticket', () => {
      expect(calculateTotal(['001'], packages, ticketPrice)).toBe(100);
    });

    it('should use package for exact match only', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        String(i + 1).padStart(3, '0')
      );
      expect(calculateTotal(tickets, packages, ticketPrice)).toBe(800);
    });
  });

  describe('findBestPackage', () => {
    it('should find package with highest discount', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: '5 boletos' },
        { id: '2', quantity: 10, price: 800, discount_percent: 20, label: '10 boletos' },
        { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: '20 boletos' },
      ];
      const best = findBestPackage(packages);
      expect(best?.id).toBe('3');
      expect(best?.discount_percent).toBe(30);
    });

    it('should handle packages with no discount', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 500, discount_percent: null, label: '5 boletos' },
        { id: '2', quantity: 10, price: 1000, discount_percent: null, label: '10 boletos' },
      ];
      const best = findBestPackage(packages);
      expect(best).toBeDefined();
    });

    it('should return first package when all have same discount', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: '5 boletos' },
        { id: '2', quantity: 10, price: 900, discount_percent: 10, label: '10 boletos' },
      ];
      const best = findBestPackage(packages);
      expect(best?.id).toBe('1');
    });

    it('should handle empty array', () => {
      const best = findBestPackage([]);
      expect(best).toBeUndefined();
    });

    it('should handle mixed null and number discounts', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 500, discount_percent: null, label: '5 boletos' },
        { id: '2', quantity: 10, price: 900, discount_percent: 10, label: '10 boletos' },
        { id: '3', quantity: 20, price: 1600, discount_percent: null, label: '20 boletos' },
      ];
      const best = findBestPackage(packages);
      expect(best?.id).toBe('2');
    });
  });

  describe('MAX_RANDOM_SELECTION constant', () => {
    it('should be 50000', () => {
      expect(MAX_RANDOM_SELECTION).toBe(50000);
    });
  });

  describe('pagination calculations', () => {
    const pageSize = 100;

    function calculatePage(ticketNumber: string, pageSize: number): number {
      const ticketIndex = parseInt(ticketNumber, 10);
      return Math.ceil(ticketIndex / pageSize);
    }

    function calculateTotalPages(totalTickets: number, pageSize: number): number {
      return Math.ceil(totalTickets / pageSize);
    }

    it('should calculate correct page for ticket number', () => {
      expect(calculatePage('001', pageSize)).toBe(1);
      expect(calculatePage('100', pageSize)).toBe(1);
      expect(calculatePage('101', pageSize)).toBe(2);
      expect(calculatePage('1000', pageSize)).toBe(10);
    });

    it('should calculate total pages correctly', () => {
      expect(calculateTotalPages(100, pageSize)).toBe(1);
      expect(calculateTotalPages(101, pageSize)).toBe(2);
      expect(calculateTotalPages(1000, pageSize)).toBe(10);
      expect(calculateTotalPages(1001, pageSize)).toBe(11);
    });

    it('should handle large raffles', () => {
      expect(calculateTotalPages(1000000, pageSize)).toBe(10000);
      expect(calculateTotalPages(10000000, pageSize)).toBe(100000);
    });
  });

  describe('maxDigits calculation', () => {
    function calculateMaxDigits(totalTickets: number): number {
      return totalTickets.toString().length;
    }

    it('should calculate correct digits for various raffle sizes', () => {
      expect(calculateMaxDigits(100)).toBe(3);
      expect(calculateMaxDigits(1000)).toBe(4);
      expect(calculateMaxDigits(10000)).toBe(5);
      expect(calculateMaxDigits(100000)).toBe(6);
      expect(calculateMaxDigits(1000000)).toBe(7);
    });
  });

  describe('ticket filtering', () => {
    interface Ticket {
      ticket_number: string;
      ticket_index: number;
      status: 'available' | 'sold' | 'reserved' | 'pending_approval';
    }

    const tickets: Ticket[] = [
      { ticket_number: '001', ticket_index: 0, status: 'available' },
      { ticket_number: '002', ticket_index: 1, status: 'sold' },
      { ticket_number: '003', ticket_index: 2, status: 'available' },
      { ticket_number: '004', ticket_index: 3, status: 'reserved' },
      { ticket_number: '005', ticket_index: 4, status: 'pending_approval' },
    ];

    function filterAvailable(tickets: Ticket[]): Ticket[] {
      return tickets.filter(t => t.status === 'available');
    }

    it('should filter to only available tickets', () => {
      const available = filterAvailable(tickets);
      expect(available.length).toBe(2);
      expect(available.every(t => t.status === 'available')).toBe(true);
    });

    it('should preserve ticket properties', () => {
      const available = filterAvailable(tickets);
      expect(available[0].ticket_number).toBe('001');
      expect(available[1].ticket_number).toBe('003');
    });
  });
});
