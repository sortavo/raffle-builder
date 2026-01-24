import { describe, it, expect } from 'vitest';

/**
 * Unit tests for PackageCards business logic
 * Testing package calculations, sorting, and best value determination
 */

interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

// Sort packages by quantity (as done in component)
function sortPackages(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => a.quantity - b.quantity);
}

// Find best value package (highest discount)
function findBestPackageId(packages: Package[]): string | undefined {
  const sorted = sortPackages(packages);
  return sorted.reduce((best, pkg) => {
    if (!best || (pkg.discount_percent || 0) > (packages.find(p => p.id === best)?.discount_percent || 0)) {
      return pkg.id;
    }
    return best;
  }, sorted[0]?.id);
}

// Calculate original price (without discount)
function calculateOriginalPrice(ticketPrice: number, quantity: number): number {
  return quantity * ticketPrice;
}

// Calculate savings
function calculateSavings(ticketPrice: number, quantity: number, packagePrice: number): number {
  return calculateOriginalPrice(ticketPrice, quantity) - packagePrice;
}

// Check if package has discount
function hasDiscount(pkg: Package): boolean {
  return (pkg.discount_percent || 0) > 0;
}

describe('PackageCards Logic', () => {
  describe('sortPackages', () => {
    it('should sort packages by quantity ascending', () => {
      const packages: Package[] = [
        { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: null },
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: null },
        { id: '2', quantity: 10, price: 800, discount_percent: 20, label: null },
      ];

      const sorted = sortPackages(packages);
      expect(sorted[0].quantity).toBe(5);
      expect(sorted[1].quantity).toBe(10);
      expect(sorted[2].quantity).toBe(20);
    });

    it('should not modify original array', () => {
      const packages: Package[] = [
        { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: null },
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: null },
      ];
      const originalFirst = packages[0];
      sortPackages(packages);
      expect(packages[0]).toBe(originalFirst);
    });

    it('should handle empty array', () => {
      expect(sortPackages([])).toEqual([]);
    });

    it('should handle single package', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: null },
      ];
      expect(sortPackages(packages)).toHaveLength(1);
    });
  });

  describe('findBestPackageId', () => {
    it('should find package with highest discount', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 450, discount_percent: 10, label: null },
        { id: '2', quantity: 10, price: 800, discount_percent: 20, label: null },
        { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: null },
      ];

      expect(findBestPackageId(packages)).toBe('3');
    });

    it('should return first package id when all have same discount', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 475, discount_percent: 5, label: null },
        { id: '2', quantity: 10, price: 950, discount_percent: 5, label: null },
      ];

      // After sorting, '1' is first
      expect(findBestPackageId(packages)).toBe('1');
    });

    it('should handle null discounts', () => {
      const packages: Package[] = [
        { id: '1', quantity: 5, price: 500, discount_percent: null, label: null },
        { id: '2', quantity: 10, price: 900, discount_percent: 10, label: null },
      ];

      expect(findBestPackageId(packages)).toBe('2');
    });

    it('should return undefined for empty array', () => {
      expect(findBestPackageId([])).toBeUndefined();
    });
  });

  describe('calculateOriginalPrice', () => {
    it('should multiply ticket price by quantity', () => {
      expect(calculateOriginalPrice(100, 5)).toBe(500);
      expect(calculateOriginalPrice(50, 10)).toBe(500);
      expect(calculateOriginalPrice(150, 3)).toBe(450);
    });

    it('should handle zero quantity', () => {
      expect(calculateOriginalPrice(100, 0)).toBe(0);
    });

    it('should handle decimal prices', () => {
      expect(calculateOriginalPrice(99.99, 2)).toBeCloseTo(199.98);
    });
  });

  describe('calculateSavings', () => {
    it('should calculate correct savings', () => {
      // 5 tickets at $100 = $500, package price $450 = $50 savings
      expect(calculateSavings(100, 5, 450)).toBe(50);
    });

    it('should return 0 for no discount', () => {
      expect(calculateSavings(100, 5, 500)).toBe(0);
    });

    it('should handle full price discount (free)', () => {
      expect(calculateSavings(100, 5, 0)).toBe(500);
    });

    it('should calculate savings for various packages', () => {
      const ticketPrice = 100;
      const packages = [
        { quantity: 5, price: 450, expectedSavings: 50 },
        { quantity: 10, price: 800, expectedSavings: 200 },
        { quantity: 20, price: 1400, expectedSavings: 600 },
      ];

      packages.forEach(pkg => {
        expect(calculateSavings(ticketPrice, pkg.quantity, pkg.price)).toBe(pkg.expectedSavings);
      });
    });
  });

  describe('hasDiscount', () => {
    it('should return true for positive discount', () => {
      expect(hasDiscount({ id: '1', quantity: 5, price: 450, discount_percent: 10, label: null })).toBe(true);
    });

    it('should return false for zero discount', () => {
      expect(hasDiscount({ id: '1', quantity: 5, price: 500, discount_percent: 0, label: null })).toBe(false);
    });

    it('should return false for null discount', () => {
      expect(hasDiscount({ id: '1', quantity: 5, price: 500, discount_percent: null, label: null })).toBe(false);
    });
  });

  describe('real-world pricing scenarios', () => {
    const ticketPrice = 100;

    it('should calculate 10% discount correctly', () => {
      const originalPrice = calculateOriginalPrice(ticketPrice, 5);
      const packagePrice = 450; // 10% off
      const savings = calculateSavings(ticketPrice, 5, packagePrice);

      expect(originalPrice).toBe(500);
      expect(savings).toBe(50);
      expect((savings / originalPrice) * 100).toBe(10);
    });

    it('should calculate 20% discount correctly', () => {
      const originalPrice = calculateOriginalPrice(ticketPrice, 10);
      const packagePrice = 800; // 20% off
      const savings = calculateSavings(ticketPrice, 10, packagePrice);

      expect(originalPrice).toBe(1000);
      expect(savings).toBe(200);
      expect((savings / originalPrice) * 100).toBe(20);
    });

    it('should calculate 30% discount correctly', () => {
      const originalPrice = calculateOriginalPrice(ticketPrice, 20);
      const packagePrice = 1400; // 30% off
      const savings = calculateSavings(ticketPrice, 20, packagePrice);

      expect(originalPrice).toBe(2000);
      expect(savings).toBe(600);
      expect((savings / originalPrice) * 100).toBe(30);
    });
  });

  describe('integration: complete package display', () => {
    const packages: Package[] = [
      { id: '1', quantity: 5, price: 450, discount_percent: 10, label: '5 boletos' },
      { id: '2', quantity: 10, price: 800, discount_percent: 20, label: '10 boletos' },
      { id: '3', quantity: 20, price: 1400, discount_percent: 30, label: 'Mejor valor' },
    ];
    const ticketPrice = 100;

    it('should prepare all data for package display', () => {
      const sorted = sortPackages(packages);
      const bestId = findBestPackageId(packages);

      sorted.forEach((pkg, index) => {
        const originalPrice = calculateOriginalPrice(ticketPrice, pkg.quantity);
        const savings = calculateSavings(ticketPrice, pkg.quantity, pkg.price);
        const isBest = pkg.id === bestId;
        const showDiscount = hasDiscount(pkg);

        // Verify each package has correct calculated values
        expect(pkg.price).toBeLessThanOrEqual(originalPrice);
        expect(savings).toBeGreaterThanOrEqual(0);
        expect(showDiscount).toBe(true);

        // Only the last one (highest discount) should be best
        if (index === sorted.length - 1) {
          expect(isBest).toBe(true);
        }
      });
    });

    it('should identify best package correctly', () => {
      const bestId = findBestPackageId(packages);
      const bestPkg = packages.find(p => p.id === bestId);

      expect(bestPkg?.quantity).toBe(20);
      expect(bestPkg?.discount_percent).toBe(30);
    });
  });

  describe('edge cases', () => {
    it('should handle package with no label', () => {
      const pkg: Package = {
        id: '1',
        quantity: 5,
        price: 450,
        discount_percent: 10,
        label: null,
      };

      // Component uses pkg.label || fallback
      const displayLabel = pkg.label || `${pkg.quantity} boletos`;
      expect(displayLabel).toBe('5 boletos');
    });

    it('should handle very large quantities', () => {
      const ticketPrice = 10;
      const quantity = 10000;
      const discountPercent = 50;
      const originalPrice = calculateOriginalPrice(ticketPrice, quantity);
      const packagePrice = originalPrice * (1 - discountPercent / 100);

      expect(originalPrice).toBe(100000);
      expect(packagePrice).toBe(50000);
      expect(calculateSavings(ticketPrice, quantity, packagePrice)).toBe(50000);
    });

    it('should handle very small ticket prices', () => {
      const ticketPrice = 0.99;
      const quantity = 100;
      const originalPrice = calculateOriginalPrice(ticketPrice, quantity);

      expect(originalPrice).toBeCloseTo(99);
    });
  });
});
