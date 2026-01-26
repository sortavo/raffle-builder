import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyCompact,
  getCurrency,
  parseCurrencyInput,
  calculatePackageDiscount,
  calculatePackagePrice,
  CURRENCIES,
} from '@/lib/currency-utils';

describe('currency-utils', () => {
  describe('getCurrency', () => {
    it('should return currency object for valid code', () => {
      const mxn = getCurrency('MXN');
      expect(mxn).toBeDefined();
      expect(mxn?.code).toBe('MXN');
      expect(mxn?.symbol).toBe('$');
      expect(mxn?.locale).toBe('es-MX');
    });

    it('should return undefined for invalid code', () => {
      expect(getCurrency('INVALID')).toBeUndefined();
      expect(getCurrency('')).toBeUndefined();
    });

    it('should handle all supported currencies', () => {
      const codes = ['MXN', 'COP', 'USD', 'ARS', 'CLP', 'PEN', 'BRL', 'EUR'];
      codes.forEach(code => {
        expect(getCurrency(code)).toBeDefined();
      });
    });
  });

  describe('formatCurrency', () => {
    it('should format MXN currency correctly', () => {
      const result = formatCurrency(1000, 'MXN');
      // Should contain the amount with Mexican formatting
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should format USD currency correctly', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'MXN');
      expect(result).toContain('0');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(1000000, 'MXN');
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should return fallback format for unknown currency', () => {
      const result = formatCurrency(100, 'UNKNOWN');
      expect(result).toBe('UNKNOWN 100.00');
    });

    it('should handle decimal amounts correctly', () => {
      // formatCurrency has minimumFractionDigits: 0, maximumFractionDigits: 2
      const result = formatCurrency(99.99, 'USD');
      expect(result).toContain('99');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format millions with M suffix', () => {
      expect(formatCurrencyCompact(1000000, 'MXN')).toBe('$1.0M');
      expect(formatCurrencyCompact(2500000, 'MXN')).toBe('$2.5M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCurrencyCompact(1000, 'MXN')).toBe('$1.0K');
      expect(formatCurrencyCompact(15000, 'MXN')).toBe('$15.0K');
      expect(formatCurrencyCompact(999999, 'MXN')).toBe('$1000.0K');
    });

    it('should format small amounts without suffix', () => {
      expect(formatCurrencyCompact(500, 'MXN')).toBe('$500');
      expect(formatCurrencyCompact(99, 'USD')).toBe('$99');
    });

    it('should handle zero', () => {
      expect(formatCurrencyCompact(0, 'MXN')).toBe('$0');
    });

    it('should return fallback for unknown currency', () => {
      expect(formatCurrencyCompact(1000, 'UNKNOWN')).toBe('UNKNOWN 1000');
    });

    it('should use correct symbol for different currencies', () => {
      expect(formatCurrencyCompact(1000, 'PEN')).toBe('S/1.0K');
      expect(formatCurrencyCompact(1000, 'BRL')).toBe('R$1.0K');
      expect(formatCurrencyCompact(1000, 'EUR')).toBe('\u20ac1.0K'); // Euro sign
    });
  });

  describe('parseCurrencyInput', () => {
    it('should parse numeric string', () => {
      expect(parseCurrencyInput('1000')).toBe(1000);
      expect(parseCurrencyInput('99.99')).toBe(99.99);
    });

    it('should remove currency symbols and commas', () => {
      expect(parseCurrencyInput('$1,000.00')).toBe(1000);
      expect(parseCurrencyInput('$99.99')).toBe(99.99);
    });

    it('should return 0 for empty string', () => {
      expect(parseCurrencyInput('')).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(parseCurrencyInput('abc')).toBe(0);
    });

    it('should handle string with only symbols', () => {
      expect(parseCurrencyInput('$,')).toBe(0);
    });
  });

  describe('calculatePackageDiscount', () => {
    it('should calculate correct discount percentage', () => {
      // 10 tickets at $100 each = $1000 full price
      // Package price $800 = 20% discount
      expect(calculatePackageDiscount(100, 10, 800)).toBe(20);
    });

    it('should return 0 for no discount', () => {
      expect(calculatePackageDiscount(100, 10, 1000)).toBe(0);
    });

    it('should handle 100% discount', () => {
      expect(calculatePackageDiscount(100, 10, 0)).toBe(100);
    });

    it('should return 0 when base price is 0', () => {
      expect(calculatePackageDiscount(0, 10, 500)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // $100 * 3 = $300, price $250 = 16.67% -> rounds to 17%
      expect(calculatePackageDiscount(100, 3, 250)).toBe(17);
    });
  });

  describe('calculatePackagePrice', () => {
    it('should calculate correct package price', () => {
      // 10 tickets at $100 each = $1000
      // 20% discount = $800
      expect(calculatePackagePrice(100, 10, 20)).toBe(800);
    });

    it('should return full price for 0% discount', () => {
      expect(calculatePackagePrice(100, 10, 0)).toBe(1000);
    });

    it('should return 0 for 100% discount', () => {
      expect(calculatePackagePrice(100, 10, 100)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // $100 * 3 = $300, 33% discount = $201
      expect(calculatePackagePrice(100, 3, 33)).toBe(201);
    });
  });

  describe('CURRENCIES constant', () => {
    it('should have all required fields for each currency', () => {
      CURRENCIES.forEach(currency => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('flag');
        expect(currency).toHaveProperty('locale');
      });
    });

    it('should have unique codes', () => {
      const codes = CURRENCIES.map(c => c.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });
  });
});
